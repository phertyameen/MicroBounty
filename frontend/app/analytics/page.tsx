"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Coins, Zap, Loader2 } from "lucide-react";
import { useBounty } from "@/context/BountyContext";
import { ethers } from "ethers";
import { CATEGORY_LABELS, Category } from "@/lib/types";
import MicroBountyABI from "@/lib/abis/MicroBounty.json";
import contractAddresses from "@/lib/abis/contract-addresses.json";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
const CONTRACT_ADDRESS = contractAddresses.MicroBounty;
const DAYS_TO_SHOW = 5;
const BLOCKS_PER_DAY = 14_400; // ~6s block time on Polkadot Hub testnet = 10 blocks/min = 14,400/day
const BLOCK_LOOKBACK = DAYS_TO_SHOW * BLOCKS_PER_DAY;

// Use the same RPC the context uses — DO NOT use NETWORKS constant (different URL)
const RPC_URL = "https://eth-rpc-testnet.polkadot.io/";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendPoint {
  date: string;
  created: number;
  completed: number;
  cancelled: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPAS(raw: string): string {
  try {
    const n = parseFloat(ethers.formatUnits(raw, 10));
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(2);
  } catch {
    return "—";
  }
}

function toDateKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function formatDateKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildDateRange(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    result.push(toDateKey(d.getTime()));
  }
  return result;
}

// ─── Event fetcher ────────────────────────────────────────────────────────────

async function fetchTrendFromEvents(): Promise<TrendPoint[]> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    MicroBountyABI.abi,
    provider,
  );

  // Get current block so we can provide a fromBlock to avoid RPC range limits
  const latestBlock = await provider.getBlockNumber();
  // ~14 days of blocks: Polkadot Hub testnet ~6s block time = ~10 blocks/min = ~201,600 blocks/14days
  const fromBlock = Math.max(0, latestBlock - BLOCK_LOOKBACK);

  console.log(
    `[Analytics] Querying events from block ${fromBlock} to ${latestBlock}`,
  );

  // ABI-confirmed event names: BountyCreated, BountyCompleted, BountyCancelled
  const [createdLogs, completedLogs, cancelledLogs] = await Promise.all([
    contract.queryFilter(
      contract.filters.BountyCreated(),
      fromBlock,
      latestBlock,
    ),
    contract.queryFilter(
      contract.filters.BountyCompleted(),
      fromBlock,
      latestBlock,
    ),
    contract.queryFilter(
      contract.filters.BountyCancelled(),
      fromBlock,
      latestBlock,
    ),
  ]);

  console.log(
    `[Analytics] Events found — created: ${createdLogs.length}, completed: ${completedLogs.length}, cancelled: ${cancelledLogs.length}`,
  );

  // Collect unique block numbers across all logs to minimise getBlock() calls
  const allLogs = [...createdLogs, ...completedLogs, ...cancelledLogs];
  const uniqueBlocks = [...new Set(allLogs.map((l) => l.blockNumber))];

  // Resolve block timestamps in parallel
  const blockTimestamps: Record<number, number> = {};
  await Promise.all(
    uniqueBlocks.map(async (blockNum) => {
      try {
        const block = await provider.getBlock(blockNum);
        if (block) blockTimestamps[blockNum] = block.timestamp * 1000;
      } catch {
        // If a single block fetch fails, skip it — don't abort the whole chart
        console.warn(`[Analytics] Could not fetch block ${blockNum}`);
      }
    }),
  );

  // Initialise day buckets
  const dateRange = buildDateRange(DAYS_TO_SHOW);
  const counts: Record<string, TrendPoint> = {};
  for (const key of dateRange) {
    counts[key] = {
      date: formatDateKey(key),
      created: 0,
      completed: 0,
      cancelled: 0,
    };
  }

  const tally = (
    logs: ethers.Log[],
    field: "created" | "completed" | "cancelled",
  ) => {
    for (const log of logs) {
      const ts = blockTimestamps[log.blockNumber];
      if (!ts) continue;
      const key = toDateKey(ts);
      if (counts[key]) counts[key][field]++;
    }
  };

  tally(createdLogs, "created");
  tally(completedLogs, "completed");
  tally(cancelledLogs, "cancelled");

  return dateRange.map((key) => counts[key]);
}

// ─── Tooltip style ────────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { fetchPlatformStats, fetchBounties, platformStats, bounties } =
    useBounty();

  const [statsLoading, setStatsLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setStatsLoading(true);
      await Promise.all([fetchPlatformStats(), fetchBounties()]);
      setStatsLoading(false);
    };
    load();
  }, [fetchPlatformStats, fetchBounties]);

  useEffect(() => {
    const load = async () => {
      setTrendLoading(true);
      setTrendError(null);
      try {
        const data = await fetchTrendFromEvents();
        setTrendData(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[Analytics] fetchTrendFromEvents failed:", err);
        setTrendError(msg);
      } finally {
        setTrendLoading(false);
      }
    };
    load();
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  const categoryData = Object.values(Category)
    .filter((v): v is Category => typeof v === "number")
    .map((cat) => {
      const count = bounties.filter((b) => b.category === cat).length;
      return {
        name: CATEGORY_LABELS[cat],
        value: count,
        percentage:
          bounties.length > 0 ? Math.round((count / bounties.length) * 100) : 0,
      };
    })
    .filter((c) => c.value > 0);

  const statusData = platformStats
    ? [
        { name: "Open", value: platformStats.activeBounties, fill: "#3b82f6" },
        {
          name: "Completed",
          value: platformStats.completedBounties,
          fill: "#10b981",
        },
        {
          name: "Cancelled",
          value: platformStats.cancelledBounties,
          fill: "#ef4444",
        },
      ]
    : [];

  const totalValueRaw = platformStats
    ? (
        BigInt(platformStats.totalValueLockedDOT) +
        BigInt(platformStats.totalPaidOutDOT)
      ).toString()
    : "0";

  const trendHasData = trendData.some(
    (p) => p.created > 0 || p.completed > 0 || p.cancelled > 0,
  );

  const formatStable = (raw: string) =>
    parseFloat(ethers.formatUnits(raw, 6)).toFixed(2);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <section className="border-b border-border bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">Platform Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Real-time insights into the MicroBounty ecosystem
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <MetricCard
            label="Total Bounties"
            value={
              statsLoading
                ? null
                : (platformStats?.totalBounties.toString() ?? "—")
            }
            icon={<Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900"
            sub={
              statsLoading
                ? null
                : platformStats
                  ? `${platformStats.activeBounties} active`
                  : "—"
            }
          />
          <MetricCard
            label="Total Value (PAS)"
            value={statsLoading ? null : formatPAS(totalValueRaw)}
            icon={
              <Coins className="w-6 h-6 text-green-600 dark:text-green-400" />
            }
            iconBg="bg-green-100 dark:bg-green-900"
            sub={
              statsLoading
                ? null
                : platformStats
                  ? `${formatPAS(platformStats.totalPaidOutDOT)} paid out`
                  : "—"
            }
          />
          <MetricCard
            label="Completed Bounties"
            value={
              statsLoading
                ? null
                : (platformStats?.completedBounties.toString() ?? "—")
            }
            icon={
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            }
            iconBg="bg-purple-100 dark:bg-purple-900"
            sub={
              statsLoading
                ? null
                : platformStats
                  ? `${Math.round((platformStats.completedBounties / Math.max(platformStats.totalBounties, 1)) * 100)}% completion rate`
                  : "—"
            }
          />
          <MetricCard
            label="Value Locked (PAS)"
            value={
              statsLoading
                ? null
                : platformStats
                  ? formatPAS(platformStats.totalValueLockedDOT)
                  : "—"
            }
            icon={
              <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            }
            iconBg="bg-orange-100 dark:bg-orange-900"
            sub={
              statsLoading
                ? null
                : platformStats
                  ? `${platformStats.cancelledBounties} cancelled`
                  : "—"
            }
          />
          <MetricCard
            label="Value Locked (Stable)"
            value={
              statsLoading
                ? null
                : platformStats
                  ? `$${formatStable(platformStats.totalValueLockedStable)}`
                  : "—"
            }
            icon={
              <Coins className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            }
            iconBg="bg-yellow-100 dark:bg-yellow-900"
            sub={
              statsLoading
                ? null
                : platformStats
                  ? `$${formatStable(platformStats.totalPaidOutStable)} paid out`
                  : "—"
            }
          />
        </div>

        {/* Status + Category charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">Bounty Status Breakdown</h2>
              <Badge variant="outline" className="text-xs">
                Live
              </Badge>
            </div>
            {statsLoading ? (
              <ChartLoader />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Bounties" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">Bounties by Category</h2>
              <Badge variant="outline" className="text-xs">
                Live
              </Badge>
            </div>
            {statsLoading ? (
              <ChartLoader />
            ) : categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                No bounties yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.percentage}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, _, props) => [
                        `${value} bounties (${props.payload.percentage}%)`,
                        props.payload.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {categoryData.map((cat, i) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-muted-foreground">
                          {cat.name}
                        </span>
                      </div>
                      <span className="font-medium">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Growth trend from events */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Platform Growth Over Time</h2>
            {trendLoading ? (
              <Badge
                variant="outline"
                className="text-xs gap-1 flex items-center"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                Fetching events…
              </Badge>
            ) : trendError ? (
              <Badge variant="destructive" className="text-xs">
                Event fetch failed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Last {DAYS_TO_SHOW} days · On-chain events
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Derived from{" "}
            <code className="bg-muted px-1 rounded">BountyCreated</code>,{" "}
            <code className="bg-muted px-1 rounded">BountyCompleted</code>, and{" "}
            <code className="bg-muted px-1 rounded">BountyCancelled</code>{" "}
            on-chain events.
          </p>

          {trendLoading ? (
            <ChartLoader height={300} />
          ) : trendError ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-2">
              <p className="text-sm text-destructive font-medium">
                Failed to load event data
              </p>
              <p className="text-xs text-muted-foreground max-w-md text-center">
                {trendError}
              </p>
            </div>
          ) : !trendHasData ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              No activity found in the last {DAYS_TO_SHOW} days.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke="#3b82f6"
                  name="Created"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  name="Completed"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="cancelled"
                  stroke="#ef4444"
                  name="Cancelled"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">
              Completion Rate
            </h3>
            {statsLoading ? (
              <StatSkeleton />
            ) : (
              <>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {platformStats
                    ? `${Math.round((platformStats.completedBounties / Math.max(platformStats.totalBounties, 1)) * 100)}%`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {platformStats?.completedBounties ?? 0} of{" "}
                  {platformStats?.totalBounties ?? 0} completed
                </p>
              </>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">
              Cancellation Rate
            </h3>
            {statsLoading ? (
              <StatSkeleton />
            ) : (
              <>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {platformStats
                    ? `${Math.round((platformStats.cancelledBounties / Math.max(platformStats.totalBounties, 1)) * 100)}%`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {platformStats?.cancelledBounties ?? 0} bounties cancelled
                </p>
              </>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">
              Total Paid Out
            </h3>
            {statsLoading ? (
              <StatSkeleton />
            ) : (
              <>
                <p className="text-3xl font-bold text-primary">
                  {platformStats
                    ? formatPAS(platformStats.totalPaidOutDOT)
                    : "—"}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    PAS
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all completed bounties
                </p>
              </>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChartLoader({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  iconBg,
  sub,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  iconBg: string;
  sub: string | null;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          {value === null ? (
            <div className="h-9 w-20 bg-muted animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold">{value}</p>
          )}
          {sub === null ? (
            <div className="h-3 w-24 bg-muted animate-pulse rounded mt-2" />
          ) : (
            <p className="text-xs text-muted-foreground mt-2">{sub}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

function StatSkeleton() {
  return <div className="h-9 w-24 bg-muted animate-pulse rounded mt-1" />;
}
