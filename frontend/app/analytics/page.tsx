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
import {
  TrendingUp,
  Coins,
  Zap,
  Loader2,
  Check,
  Copy,
  Trophy,
  TrophyIcon,
} from "lucide-react";
import { useBounty } from "@/context/BountyContext";
import { ethers } from "ethers";
import { CATEGORY_LABELS, Category } from "@/lib/types";
import MicroBountyABI from "@/lib/abis/MicroBounty.json";
import contractAddresses from "@/lib/abis/contract-addresses.json";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
const CONTRACT_ADDRESS = contractAddresses.MicroBounty;
const RPC_URL = "https://eth-rpc-testnet.polkadot.io/";

interface TrendPoint {
  date: string;
  created: number;
  completed: number;
  cancelled: number;
}

interface LeaderEntry {
  address: string;
  score: number;
  bountiesCreated: number;
  bountiesCompleted: number;
  totalEarnedDOT: string;
  totalSpentDOT: string;
  role: "Creator" | "Hunter" | "Both";
}

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

async function fetchLeaderboard(
  bounties: Awaited<
    ReturnType<typeof import("@/context/BountyContext").useBounty>
  >["bounties"],
): Promise<LeaderEntry[]> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    MicroBountyABI.abi,
    provider,
  );

  // Collect every unique address that has touched the platform
  const addresses = new Set<string>();
  for (const b of bounties) {
    if (b.creator) addresses.add(b.creator.toLowerCase());
    if (b.hunter && b.hunter !== ethers.ZeroAddress)
      addresses.add(b.hunter.toLowerCase());
  }

  if (addresses.size === 0) return [];

  // Fetch getUserStats for each address in parallel
  const entries = await Promise.all(
    [...addresses].map(async (addr): Promise<LeaderEntry | null> => {
      try {
        const s = await contract.getUserStats(addr);
        const created = Number(s.bountiesCreated);
        const completed = Number(s.bountiesCompleted);
        const earnedDOT = s.totalEarnedDOT.toString();
        const spentDOT = s.totalSpentDOT.toString();

        // Scoring formula:
        //   +3 per bounty completed (hunter activity — hardest to fake)
        //   +1 per bounty created   (creator activity)
        //   +1 per 1000 PAS earned  (hunter earnings weight)
        //   +0.5 per 1000 PAS spent (creator spend weight)
        const earnedPAS = parseFloat(ethers.formatUnits(earnedDOT, 10));
        const spentPAS = parseFloat(ethers.formatUnits(spentDOT, 10));
        const score =
          completed * 3 + created * 1 + earnedPAS / 1000 + spentPAS / 2000;

        if (score === 0) return null;

        const role: LeaderEntry["role"] =
          created > 0 && completed > 0
            ? "Both"
            : completed > 0
              ? "Hunter"
              : "Creator";

        return {
          address: addr,
          score,
          bountiesCreated: created,
          bountiesCompleted: completed,
          totalEarnedDOT: earnedDOT,
          totalSpentDOT: spentDOT,
          role,
        };
      } catch {
        return null;
      }
    }),
  );

  return entries
    .filter((e): e is LeaderEntry => e !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

async function fetchTrendFromEvents(): Promise<TrendPoint[]> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    MicroBountyABI.abi,
    provider,
  );

  const latestBlock = await provider.getBlockNumber();

  // Find the contract's deploy block by querying from block 0.
  // The very first BountyCreated event tells us the earliest meaningful activity,
  // but the deploy block itself is more accurate — fetch it via the contract's
  // creation transaction if available, otherwise fall back to block 0.
  let deployTimestampMs: number;
  let fromBlock = 0;

  try {
    // Query all BountyCreated events from genesis to find the oldest one
    const allCreated = await contract.queryFilter(
      contract.filters.BountyCreated(),
      0,
      latestBlock,
    );

    if (allCreated.length > 0) {
      // Sort ascending and use the first event's block as the origin
      const firstBlock = allCreated
        .map((l) => l.blockNumber)
        .sort((a, b) => a - b)[0];

      const deployBlock = await provider.getBlock(firstBlock);
      deployTimestampMs = deployBlock
        ? deployBlock.timestamp * 1000
        : Date.now();
      fromBlock = firstBlock;
    } else {
      // No events yet — fall back to a reasonable default (contract likely just deployed)
      const latest = await provider.getBlock(latestBlock);
      deployTimestampMs = latest ? latest.timestamp * 1000 : Date.now();
      fromBlock = latestBlock;
    }
  } catch {
    console.warn(
      "[Analytics] Could not resolve deploy block, falling back to latest",
    );
    deployTimestampMs = Date.now();
    fromBlock = latestBlock;
  }

  // Calculate how many days have passed since contract origin
  const msPerDay = 86_400_000;
  const daysElapsed = Math.max(
    1,
    Math.ceil((Date.now() - deployTimestampMs) / msPerDay) + 1,
  );

  console.log(
    `[Analytics] Contract origin: ${new Date(deployTimestampMs).toISOString()}, showing ${daysElapsed} days`,
  );
  console.log(
    `[Analytics] Querying events from block ${fromBlock} to ${latestBlock}`,
  );

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
    `[Analytics] Events — created: ${createdLogs.length}, completed: ${completedLogs.length}, cancelled: ${cancelledLogs.length}`,
  );

  // Resolve unique block timestamps
  const allLogs = [...createdLogs, ...completedLogs, ...cancelledLogs];
  const uniqueBlocks = [...new Set(allLogs.map((l) => l.blockNumber))];

  const blockTimestamps: Record<number, number> = {};
  await Promise.all(
    uniqueBlocks.map(async (blockNum) => {
      try {
        const block = await provider.getBlock(blockNum);
        if (block) blockTimestamps[blockNum] = block.timestamp * 1000;
      } catch {
        console.warn(`[Analytics] Could not fetch block ${blockNum}`);
      }
    }),
  );

  // Build date buckets from deploy day to today
  const dateRange = buildDateRange(daysElapsed);
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

const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

export default function AnalyticsPage() {
  const { fetchPlatformStats, fetchBounties, platformStats, bounties } =
    useBounty();

  const [statsLoading, setStatsLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [leaderLoading, setLeaderLoading] = useState(true);

  // Run after bounties are loaded so we have addresses to score
  useEffect(() => {
    if (statsLoading) return;
    const load = async () => {
      setLeaderLoading(true);
      try {
        const data = await fetchLeaderboard(bounties);
        setLeaderboard(data);
      } catch (err) {
        console.error("[Analytics] fetchLeaderboard failed:", err);
      } finally {
        setLeaderLoading(false);
      }
    };
    load();
  }, [bounties, statsLoading]);

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

  const formatStable = (raw: string) => {
    try {
      const n = parseFloat(ethers.formatUnits(raw, 6));
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
      return n.toFixed(2);
    } catch {
      return "—";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <section className="border-b border-border bg-linear-to-br from-background via-background to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">Platform Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Real-time insights into the MicroBounty ecosystem
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
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
                  <XAxis
                    dataKey="name"
                    className="text-xs"
                    padding={{ left: 20, right: 20 }}
                  />
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
              <div className="h-75 flex items-center justify-center text-sm text-muted-foreground">
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
                Since contract deployment · On-chain events
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
            <div className="h-75 flex flex-col items-center justify-center gap-2">
              <p className="text-sm text-destructive font-medium">
                Failed to load event data
              </p>
              <p className="text-xs text-muted-foreground max-w-md text-center">
                {trendError}
              </p>
            </div>
          ) : !trendHasData ? (
            <div className="h-75 flex items-center justify-center text-sm text-muted-foreground">
              No activity found since contract deployment.
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
        {/* Leaderboard */}
        <Card className="p-6 mt-6 overflow-hidden relative">
          {/* Subtle background accent */}
          <div className="absolute inset-0 bg-linear-to-br from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

          <div className="flex items-center justify-between mb-6 relative">
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-5 h-5 text-yellow-500" />
              <h2 className="font-semibold">Top Contributors</h2>
            </div>
            <Badge variant="outline" className="text-xs">
              All time · Activity score
            </Badge>
          </div>

          {leaderLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              No activity recorded yet
            </div>
          ) : (
            <div className="space-y-3 relative">
              {leaderboard.map((entry, i) => (
                <LeaderboardRow
                  key={entry.address}
                  entry={entry}
                  rank={i + 1}
                  topScore={leaderboard[0].score}
                />
              ))}
            </div>
          )}
        </Card>
      </main>

      <Footer />
    </div>
  );
}

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

const RANK_CONFIG = [
  {
    medal: "🥇",
    bar: "bg-yellow-400",
    glow: "shadow-yellow-400/30",
    label: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-300/40 dark:border-yellow-500/30",
  },
  {
    medal: "🥈",
    bar: "bg-slate-400",
    glow: "shadow-slate-400/20",
    label: "text-slate-500  dark:text-slate-400",
    border: "border-slate-300/40  dark:border-slate-500/30",
  },
  {
    medal: "🥉",
    bar: "bg-amber-600",
    glow: "shadow-amber-600/20",
    label: "text-amber-700  dark:text-amber-500",
    border: "border-amber-300/40  dark:border-amber-600/30",
  },
  {
    medal: "4",
    bar: "bg-sky-400",
    glow: "shadow-sky-400/20",
    label: "text-sky-600    dark:text-sky-400",
    border: "border-sky-300/40    dark:border-sky-500/30",
  },
  {
    medal: "5",
    bar: "bg-indigo-400",
    glow: "shadow-indigo-400/20",
    label: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-300/40 dark:border-indigo-500/30",
  },
];

const ROLE_COLORS: Record<LeaderEntry["role"], string> = {
  Both: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Hunter:
    "bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300",
  Creator:
    "bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300",
};

function LeaderboardRow({
  entry,
  rank,
  topScore,
}: {
  entry: LeaderEntry;
  rank: number;
  topScore: number;
}) {
  const [copied, setCopied] = useState(false);
  const cfg = RANK_CONFIG[rank - 1];
  const pct = topScore > 0 ? Math.round((entry.score / topScore) * 100) : 0;
  const short = `${entry.address.slice(0, 6)}…${entry.address.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(entry.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const earnedPAS = parseFloat(
    ethers.formatUnits(entry.totalEarnedDOT, 10),
  ).toFixed(1);
  const spentPAS = parseFloat(
    ethers.formatUnits(entry.totalSpentDOT, 10),
  ).toFixed(1);

  return (
    <div
      className={`group relative flex items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-200 hover:shadow-md ${cfg.border} ${cfg.glow} bg-card`}
    >
      {/* Rank medal */}
      <span className="text-2xl w-8 text-center select-none shrink-0">
        {cfg.medal}
      </span>

      {/* Address + copy */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <button
            onClick={copy}
            className="flex items-center gap-1.5 group/copy"
            title="Copy full address"
          >
            <span className={`font-mono text-sm font-semibold ${cfg.label}`}>
              {short}
            </span>
            <span className="opacity-0 group-hover/copy:opacity-100 transition-opacity">
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </span>
          </button>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLORS[entry.role]}`}
          >
            {entry.role}
          </span>
        </div>

        {/* Score bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats cluster */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <div className="text-center">
          <p className="font-semibold text-foreground">
            {entry.bountiesCreated}
          </p>
          <p>created</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">
            {entry.bountiesCompleted}
          </p>
          <p>completed</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">{earnedPAS}</p>
          <p>earned PAS</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">{spentPAS}</p>
          <p>spent PAS</p>
        </div>
      </div>

      {/* Score badge — far right */}
      <div className={`text-right shrink-0`}>
        <p className={`text-lg font-bold tabular-nums ${cfg.label}`}>
          {Math.round(entry.score)}
        </p>
        <p className="text-[10px] text-muted-foreground">score</p>
      </div>
    </div>
  );
}
