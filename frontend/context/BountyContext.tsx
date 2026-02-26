"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { ethers, type ContractTransactionResponse } from "ethers";
import type {
  Bounty,
  BountyFilters,
  CreateBountyArgs,
  SubmitWorkArgs,
  UserStats,
  PlatformStats,
  CurrencyStats,
  Token,
  Transaction,
  TransactionType,
} from "@/lib/types";

import {
  BountyStatus,
  BountyStatusIndex,
  Category,
  CATEGORY_LABELS,
} from "@/lib/types";

import MicroBountyABI from "@/lib/abis/MicroBounty.json";
import contractAddresses from "@/lib/abis/contract-addresses.json";

// -------------------------------------------------------------
//  Constants
// -------------------------------------------------------------

const CONTRACT_ADDRESS = contractAddresses.MicroBounty;

/** address(0) represents native DOT in the contract */
const DOT_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Known token metadata by address (lower-cased).
 * Extend this map as you whitelist more tokens.
 */
const TOKEN_METADATA: Record<string, Omit<Token, "address">> = {
  [DOT_ADDRESS]: { id: "pas", symbol: "PAS", decimals: 10, chainId: 420420417 },
};

// -------------------------------------------------------------
//  Helpers
// -------------------------------------------------------------

/** Resolve a paymentToken address to a Token object. */
function resolveToken(address: string, chainId: number): Token {
  const lower = address.toLowerCase();
  const meta = TOKEN_METADATA[lower] ?? TOKEN_METADATA[DOT_ADDRESS];
  return { ...meta, address, chainId };
}

/** Convert a raw contract Bounty tuple to our typed Bounty.
 *  ethers v6 returns a Result with named properties — we access
 *  them by name only, which is always safe and avoids index errors. */
function parseContractBounty(raw: ethers.Result, chainId: number): Bounty {
  const id: string = raw.id.toString();
  const creator: string = raw.creator;
  const title: string = raw.title;
  const description: string = raw.description;
  const reward: string = raw.reward.toString();
  const paymentToken: string = raw.paymentToken;
  const status: BountyStatusIndex = Number(raw.status);
  const hunter: string = raw.hunter;
  const proofUrl: string = raw.proofUrl;
  const submissionNotes: string = raw.submissionNotes;
  const createdAt: number = Number(raw.createdAt);
  const submittedAt: number = Number(raw.submittedAt);
  const completedAt: number = Number(raw.completedAt);
  const category: Category = Number(raw.category) as Category;

  return {
    id,
    creator,
    title,
    description,
    reward,
    paymentToken,
    status,
    hunter,
    proofUrl,
    submissionNotes,
    createdAt,
    submittedAt,
    completedAt,
    category,
    token: resolveToken(paymentToken, chainId),
  };
}

/** Map BountyStatus string enum → BountyStatusIndex number for contract calls. */
function statusToIndex(status: BountyStatus): BountyStatusIndex {
  return {
    [BountyStatus.OPEN]: BountyStatusIndex.OPEN,
    [BountyStatus.IN_PROGRESS]: BountyStatusIndex.IN_PROGRESS,
    [BountyStatus.COMPLETED]: BountyStatusIndex.COMPLETED,
    [BountyStatus.CANCELLED]: BountyStatusIndex.CANCELLED,
  }[status];
}

/** Map BountyStatusIndex → BountyStatus string. */
function indexToStatus(index: BountyStatusIndex): BountyStatus {
  return {
    [BountyStatusIndex.OPEN]: BountyStatus.OPEN,
    [BountyStatusIndex.IN_PROGRESS]: BountyStatus.IN_PROGRESS,
    [BountyStatusIndex.COMPLETED]: BountyStatus.COMPLETED,
    [BountyStatusIndex.CANCELLED]: BountyStatus.CANCELLED,
  }[index];
}

// -------------------------------------------------------------
//  Context shape
// -------------------------------------------------------------

interface BountyContextType {
  // --- State ---
  bounties: Bounty[];
  selectedBounty: Bounty | null;
  filters: BountyFilters;
  userStats: UserStats | null;
  platformStats: PlatformStats | null;
  supportedTokens: string[];
  transactions: Transaction[];
  isLoading: boolean;
  isWritePending: boolean;
  error: string | null;

  // --- Read functions (contract view calls) ---
  fetchBounties: (filters?: BountyFilters) => Promise<void>;
  fetchBountyById: (id: string) => Promise<void>;
  fetchBountiesByStatus: (status: BountyStatus) => Promise<Bounty[]>;
  fetchBountiesByCreator: (address: string) => Promise<Bounty[]>;
  fetchBountiesByToken: (tokenAddress: string) => Promise<Bounty[]>;
  fetchUserBounties: (address: string) => Promise<Bounty[]>;
  fetchUserSubmissions: (address: string) => Promise<Bounty[]>;
  fetchUserStats: (address: string) => Promise<UserStats>;
  fetchPlatformStats: () => Promise<PlatformStats>;
  fetchCurrencyStats: () => Promise<CurrencyStats>;
  fetchSupportedTokens: () => Promise<string[]>;
  isTokenSupported: (tokenAddress: string) => Promise<boolean>;

  // --- Write functions (contract state-changing calls) ---
  createBounty: (args: CreateBountyArgs) => Promise<string | null>;
  submitWork: (args: SubmitWorkArgs) => Promise<boolean>;
  approveBounty: (bountyId: string) => Promise<boolean>;
  cancelBounty: (bountyId: string) => Promise<boolean>;

  // --- UI helpers ---
  selectBounty: (bounty: Bounty | null) => void;
  updateFilters: (filters: Partial<BountyFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
}

// -------------------------------------------------------------
//  Defaults
// -------------------------------------------------------------

const defaultFilters: BountyFilters = {
  status: [],
  sortBy: "recent",
};

const BountyContext = createContext<BountyContextType | undefined>(undefined);

// -------------------------------------------------------------
//  Provider
// -------------------------------------------------------------

export function BountyProvider({ children }: { children: React.ReactNode }) {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [filters, setFilters] = useState<BountyFilters>(defaultFilters);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(
    null,
  );
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWritePending, setIsWritePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache the last known chainId to avoid redundant provider calls
  const chainIdRef = useRef<number>(420420417);

  // -------------------------------------------------------
  //  Internal: get a read-only or signer provider + contract
  // -------------------------------------------------------

  const getReadContract = useCallback(async () => {
    const provider = new ethers.JsonRpcProvider(
      "https://eth-rpc-testnet.polkadot.io/",
    );
    const network = await provider.getNetwork();

    console.log("Network:", network?.chainId);
    chainIdRef.current = Number(network.chainId);
    return new ethers.Contract(CONTRACT_ADDRESS, MicroBountyABI.abi, provider);
  }, []);

  const getWriteContract = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet detected. Please install a Web3 wallet.");
    }
    const provider = new ethers.BrowserProvider(
      window.ethereum as unknown as ethers.Eip1193Provider,
    );
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    chainIdRef.current = Number(network.chainId);
    return new ethers.Contract(CONTRACT_ADDRESS, MicroBountyABI.abi, signer);
  }, []);

  // -------------------------------------------------------
  //  Internal: fetch multiple bounties by their IDs
  // -------------------------------------------------------

  const fetchBountiesByIds = useCallback(
    async (ids: string[], contract: ethers.Contract): Promise<Bounty[]> => {
      const results = await Promise.all(
        ids.map((id) => contract.getBounty(id)),
      );
      return results.map((raw) => parseContractBounty(raw, chainIdRef.current));
    },
    [],
  );

  // -------------------------------------------------------
  //  Internal: apply frontend filters & sorting to a list
  // -------------------------------------------------------

  const applyFilters = useCallback(
    (list: Bounty[], f: BountyFilters): Bounty[] => {
      let result = [...list];

      if (f.status.length > 0) {
        const indices = f.status.map(statusToIndex);
        result = result.filter((b) => indices.includes(b.status));
      }
      if (f.paymentToken) {
        result = result.filter(
          (b) => b.paymentToken.toLowerCase() === f.paymentToken!.toLowerCase(),
        );
      }
      if (f.category !== undefined) {
        result = result.filter((b) => b.category === f.category);
      }
      if (f.minReward) {
        const min = BigInt(f.minReward);
        result = result.filter((b) => BigInt(b.reward) >= min);
      }
      if (f.maxReward) {
        const max = BigInt(f.maxReward);
        result = result.filter((b) => BigInt(b.reward) <= max);
      }
      if (f.search) {
        const q = f.search.toLowerCase();
        result = result.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.description.toLowerCase().includes(q),
        );
      }

      switch (f.sortBy) {
        case "recent":
          result.sort((a, b) => b.createdAt - a.createdAt);
          break;
        case "oldest":
          result.sort((a, b) => a.createdAt - b.createdAt);
          break;
        case "reward-high":
          result.sort((a, b) => (BigInt(b.reward) > BigInt(a.reward) ? 1 : -1));
          break;
        case "reward-low":
          result.sort((a, b) => (BigInt(a.reward) > BigInt(b.reward) ? 1 : -1));
          break;
      }

      return result;
    },
    [],
  );

  // -------------------------------------------------------
  //  Internal: record a transaction in local state
  // -------------------------------------------------------

  const recordTx = useCallback(
    (
      tx: ContractTransactionResponse,
      type: TransactionType,
      bountyId?: string,
      amount?: string,
      token?: Token,
    ) => {
      const entry: Transaction = {
        hash: tx.hash,
        type,
        status: "PENDING",
        from: tx.from,
        bountyId,
        amount,
        token,
        timestamp: Date.now(),
      };
      setTransactions((prev) => [entry, ...prev]);

      // Resolve once mined
      tx.wait().then((receipt) => {
        setTransactions((prev) =>
          prev.map((t) =>
            t.hash === tx.hash
              ? {
                  ...t,
                  status: receipt ? "SUCCESS" : "FAILED",
                  blockNumber: receipt?.blockNumber,
                  gasUsed: receipt?.gasUsed?.toString(),
                }
              : t,
          ),
        );
      });

      return entry;
    },
    [],
  );

  // -------------------------------------------------------
  //  Read: fetch all bounties (with optional filters)
  // -------------------------------------------------------

  // In BountyProvider, add a ref to track current filters
  const filtersRef = useRef<BountyFilters>(defaultFilters);

  // Remove `filters` from fetchBounties deps entirely
  const fetchBounties = useCallback(
    async (filterParams?: BountyFilters) => {
      const resolvedFilters = filterParams ?? filtersRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const contract = await getReadContract();
        const count: bigint = await contract.getBountyCount();
        const ids = Array.from({ length: Number(count) }, (_, i) =>
          String(i + 1),
        );
        const all = await fetchBountiesByIds(ids, contract);
        const filtered = applyFilters(all, resolvedFilters);
        setBounties(filtered);
        setFilters(resolvedFilters);
        filtersRef.current = resolvedFilters;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch bounties",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getReadContract, fetchBountiesByIds, applyFilters], // ← `filters` removed
  );

  // -------------------------------------------------------
  //  Read: single bounty by ID  →  getBounty(id)
  // -------------------------------------------------------

  const fetchBountyById = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const contract = await getReadContract();
        const raw = await contract.getBounty(id);
        const bounty = parseContractBounty(raw, chainIdRef.current);
        setSelectedBounty(bounty);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bounty not found");
      } finally {
        setIsLoading(false);
      }
    },
    [getReadContract],
  );

  // -------------------------------------------------------
  //  Read: bounties by status  →  getBountiesByStatus(status)
  // -------------------------------------------------------

  const fetchBountiesByStatus = useCallback(
    async (status: BountyStatus): Promise<Bounty[]> => {
      const contract = await getReadContract();
      const ids: bigint[] = await contract.getBountiesByStatus(
        statusToIndex(status),
      );
      return fetchBountiesByIds(
        ids.map((id) => id.toString()),
        contract,
      );
    },
    [getReadContract, fetchBountiesByIds],
  );

  // -------------------------------------------------------
  //  Read: bounties by creator  →  getBountiesByCreator(addr)
  // -------------------------------------------------------

  const fetchBountiesByCreator = useCallback(
    async (address: string): Promise<Bounty[]> => {
      const contract = await getReadContract();
      const ids: bigint[] = await contract.getBountiesByCreator(address);
      return fetchBountiesByIds(
        ids.map((id) => id.toString()),
        contract,
      );
    },
    [getReadContract, fetchBountiesByIds],
  );

  // -------------------------------------------------------
  //  Read: bounties by token  →  getBountiesByToken(addr)
  // -------------------------------------------------------

  const fetchBountiesByToken = useCallback(
    async (tokenAddress: string): Promise<Bounty[]> => {
      const contract = await getReadContract();
      const ids: bigint[] = await contract.getBountiesByToken(tokenAddress);
      return fetchBountiesByIds(
        ids.map((id) => id.toString()),
        contract,
      );
    },
    [getReadContract, fetchBountiesByIds],
  );

  // -------------------------------------------------------
  //  Read: user bounties  →  getUserBounties(addr)
  // -------------------------------------------------------

  const fetchUserBounties = useCallback(
    async (address: string): Promise<Bounty[]> => {
      const contract = await getReadContract();
      const ids: bigint[] = await contract.getUserBounties(address);
      return fetchBountiesByIds(
        ids.map((id) => id.toString()),
        contract,
      );
    },
    [getReadContract, fetchBountiesByIds],
  );

  // -------------------------------------------------------
  //  Read: user submissions  →  getUserSubmissions(addr)
  // -------------------------------------------------------

  const fetchUserSubmissions = useCallback(
    async (address: string): Promise<Bounty[]> => {
      const contract = await getReadContract();
      const ids: bigint[] = await contract.getUserSubmissions(address);
      return fetchBountiesByIds(
        ids.map((id) => id.toString()),
        contract,
      );
    },
    [getReadContract, fetchBountiesByIds],
  );

  // -------------------------------------------------------
  //  Read: user stats  →  getUserStats(addr)
  // -------------------------------------------------------

  const fetchUserStats = useCallback(
    async (address: string): Promise<UserStats> => {
      const contract = await getReadContract();
      const raw = await contract.getUserStats(address);
      const stats: UserStats = {
        bountiesCreated: Number(raw.bountiesCreated),
        bountiesCompleted: Number(raw.bountiesCompleted),
        totalSpentDOT: raw.totalSpentDOT.toString(),
        totalSpentStable: raw.totalSpentStable.toString(),
        totalEarnedDOT: raw.totalEarnedDOT.toString(),
        totalEarnedStable: raw.totalEarnedStable.toString(),
      };
      setUserStats(stats);
      return stats;
    },
    [getReadContract],
  );

  // -------------------------------------------------------
  //  Read: platform stats  →  getPlatformStats()
  // -------------------------------------------------------

  const fetchPlatformStats = useCallback(async (): Promise<PlatformStats> => {
    const contract = await getReadContract();
    const raw = await contract.getPlatformStats();
    const stats: PlatformStats = {
      totalBounties: Number(raw.totalBounties),
      activeBounties: Number(raw.activeBounties),
      completedBounties: Number(raw.completedBounties),
      cancelledBounties: Number(raw.cancelledBounties),
      totalValueLockedDOT: raw.totalValueLockedDOT.toString(),
      totalValueLockedStable: raw.totalValueLockedStable.toString(),
      totalPaidOutDOT: raw.totalPaidOutDOT.toString(),
      totalPaidOutStable: raw.totalPaidOutStable.toString(),
    };
    setPlatformStats(stats);
    return stats;
  }, [getReadContract]);

  // -------------------------------------------------------
  //  Read: currency stats  →  getCurrencyStats()
  // -------------------------------------------------------

  const fetchCurrencyStats = useCallback(async (): Promise<CurrencyStats> => {
    const contract = await getReadContract();
    const [dotBounties, tokenBounties, tokens] =
      await contract.getCurrencyStats();
    return {
      dotBounties: Number(dotBounties),
      tokenBounties: tokenBounties.map(Number),
      tokens: [...tokens],
    };
  }, [getReadContract]);

  // -------------------------------------------------------
  //  Read: supported tokens  →  getSupportedTokens()
  // -------------------------------------------------------

  const fetchSupportedTokens = useCallback(async (): Promise<string[]> => {
    const contract = await getReadContract();
    const tokens: string[] = await contract.getSupportedTokens();
    setSupportedTokens(tokens);
    return tokens;
  }, [getReadContract]);

  // -------------------------------------------------------
  //  Read: is token supported  →  isTokenSupported(addr)
  // -------------------------------------------------------

  const isTokenSupported = useCallback(
    async (tokenAddress: string): Promise<boolean> => {
      const contract = await getReadContract();
      return contract.isTokenSupported(tokenAddress);
    },
    [getReadContract],
  );

  // -------------------------------------------------------
  //  Write: createBounty
  //
  //  For DOT bounties:  pass msg.value = reward
  //  For ERC20 bounties: caller must approve the contract first
  // -------------------------------------------------------

  const createBounty = useCallback(
    async (args: CreateBountyArgs): Promise<string | null> => {
      console.log("Contract address:", CONTRACT_ADDRESS);
      console.log("Args:", args);

      setIsWritePending(true);
      setError(null);

      try {
        const contract = await getWriteContract();
        const isDOT = args.paymentToken === DOT_ADDRESS;

        // 🔥 Single correct transaction call
        const tx: ContractTransactionResponse = await contract.createBounty(
          args.title,
          args.description,
          args.reward,
          args.paymentToken,
          args.category,
          isDOT ? { value: args.reward } : {},
        );

        const token = resolveToken(args.paymentToken, chainIdRef.current);
        recordTx(tx, "CREATE_BOUNTY", undefined, args.reward, token);

        const receipt = await tx.wait();

        // Extract bountyId from event
        const iface = new ethers.Interface(MicroBountyABI.abi);
        let newBountyId: string | null = null;

        for (const log of receipt?.logs ?? []) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "BountyCreated") {
              newBountyId = parsed.args.bountyId.toString();
              break;
            }
          } catch {
            // ignore non-matching logs
          }
        }

        await fetchBounties();
        return newBountyId;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to create bounty";
        setError(msg);
        return null;
      } finally {
        setIsWritePending(false);
      }
    },
    [getWriteContract, recordTx, fetchBounties],
  );

  // -------------------------------------------------------
  //  Write: submitWork
  // -------------------------------------------------------

  const submitWork = useCallback(
    async (args: SubmitWorkArgs): Promise<boolean> => {
      setIsWritePending(true);
      setError(null);
      try {
        const contract = await getWriteContract();
        const tx: ContractTransactionResponse = await contract.submitWork(
          args.bountyId,
          args.proofUrl,
          args.notes,
        );
        recordTx(tx, "SUBMIT_WORK", args.bountyId);
        await tx.wait();

        // Refresh the selected bounty if it matches
        if (selectedBounty?.id === args.bountyId) {
          await fetchBountyById(args.bountyId);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit work");
        return false;
      } finally {
        setIsWritePending(false);
      }
    },
    [getWriteContract, recordTx, selectedBounty, fetchBountyById],
  );

  // -------------------------------------------------------
  //  Write: approveBounty
  // -------------------------------------------------------

  const approveBounty = useCallback(
    async (bountyId: string): Promise<boolean> => {
      setIsWritePending(true);
      setError(null);
      try {
        const contract = await getWriteContract();
        const tx: ContractTransactionResponse =
          await contract.approveBounty(bountyId);
        recordTx(tx, "APPROVE_BOUNTY", bountyId);
        await tx.wait();

        // Refresh affected state
        if (selectedBounty?.id === bountyId) {
          await fetchBountyById(bountyId);
        }
        await fetchBounties();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to approve bounty",
        );
        return false;
      } finally {
        setIsWritePending(false);
      }
    },
    [
      getWriteContract,
      recordTx,
      selectedBounty,
      fetchBountyById,
      fetchBounties,
    ],
  );

  // -------------------------------------------------------
  //  Write: cancelBounty
  // -------------------------------------------------------

  const cancelBounty = useCallback(
    async (bountyId: string): Promise<boolean> => {
      setIsWritePending(true);
      setError(null);
      try {
        const contract = await getWriteContract();
        const tx: ContractTransactionResponse =
          await contract.cancelBounty(bountyId);
        recordTx(tx, "CANCEL_BOUNTY", bountyId);
        await tx.wait();

        if (selectedBounty?.id === bountyId) {
          await fetchBountyById(bountyId);
        }
        await fetchBounties();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to cancel bounty",
        );
        return false;
      } finally {
        setIsWritePending(false);
      }
    },
    [
      getWriteContract,
      recordTx,
      selectedBounty,
      fetchBountyById,
      fetchBounties,
    ],
  );

  // -------------------------------------------------------
  //  UI helpers
  // -------------------------------------------------------

  const selectBounty = useCallback((bounty: Bounty | null) => {
    setSelectedBounty(bounty);
  }, []);

  // Keep it in sync
  const updateFilters = useCallback((newFilters: Partial<BountyFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };
      filtersRef.current = next;
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // -------------------------------------------------------
  //  Context value
  // -------------------------------------------------------

  const value: BountyContextType = {
    bounties,
    selectedBounty,
    filters,
    userStats,
    platformStats,
    supportedTokens,
    transactions,
    isLoading,
    isWritePending,
    error,

    fetchBounties,
    fetchBountyById,
    fetchBountiesByStatus,
    fetchBountiesByCreator,
    fetchBountiesByToken,
    fetchUserBounties,
    fetchUserSubmissions,
    fetchUserStats,
    fetchPlatformStats,
    fetchCurrencyStats,
    fetchSupportedTokens,
    isTokenSupported,

    createBounty,
    submitWork,
    approveBounty,
    cancelBounty,

    selectBounty,
    updateFilters,
    clearFilters,
    clearError,
  };

  return (
    <BountyContext.Provider value={value}>{children}</BountyContext.Provider>
  );
}

// -------------------------------------------------------------
//  Hook
// -------------------------------------------------------------

export function useBounty(): BountyContextType {
  const context = useContext(BountyContext);
  if (context === undefined) {
    throw new Error("useBounty must be used within a BountyProvider");
  }
  return context;
}

// -------------------------------------------------------------
//  Convenience re-exports so consumers don't need extra imports
// -------------------------------------------------------------

export { BountyStatus, Category, CATEGORY_LABELS, DOT_ADDRESS };
export type { CreateBountyArgs, SubmitWorkArgs };
