/** Mirrors the contract's BountyStatus enum. */
export enum BountyStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Numeric values used when calling the contract (uint8). */
export enum BountyStatusIndex {
  OPEN = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  CANCELLED = 3,
}

/** Mirrors the contract's Category enum (stored as uint8). */
export enum Category {
  DEVELOPMENT = 0,
  DESIGN = 1,
  CONTENT = 2,
  BUG_FIX = 3,
  OTHER = 4,
}

/** Human-readable labels for each Category value. */
export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.DEVELOPMENT]: 'Development',
  [Category.DESIGN]: 'Design',
  [Category.CONTENT]: 'Content',
  [Category.BUG_FIX]: 'Bug Fix',
  [Category.OTHER]: 'Other',
}

// -------------------------------------------------------------
//  Contract Structs  (match Solidity structs 1-to-1)
// -------------------------------------------------------------

/**
 * Mirrors the contract's Bounty struct exactly.
 * All numeric values from the contract are represented as strings
 * to safely handle BigInt/uint256 without precision loss.
 *
 * paymentToken === '0x0000000000000000000000000000000000000000'  →  native DOT
 * paymentToken === any other address                             →  ERC20 token
 */
export interface ContractBounty {
  id: string              // uint256 → string
  creator: string         // address
  title: string
  description: string
  reward: string          // uint256 → string (wei / smallest unit)
  paymentToken: string    // address — address(0) = native DOT
  status: BountyStatusIndex
  hunter: string          // address — zero address until submitted
  proofUrl: string        // empty until work is submitted
  submissionNotes: string // empty until work is submitted
  createdAt: number       // uint256 unix timestamp
  submittedAt: number     // 0 until work submitted
  completedAt: number     // 0 until approved
  category: Category      // uint8
}

/**
 * Mirrors the contract's UserStats struct.
 * All amounts are strings (uint256 → string).
 */
export interface UserStats {
  bountiesCreated: number
  bountiesCompleted: number
  totalSpentDOT: string
  totalSpentStable: string
  totalEarnedDOT: string
  totalEarnedStable: string
}

/**
 * Mirrors the contract's PlatformStats struct.
 * All amounts are strings (uint256 → string).
 */
export interface PlatformStats {
  totalBounties: number
  activeBounties: number
  completedBounties: number
  cancelledBounties: number
  totalValueLockedDOT: string
  totalValueLockedStable: string
  totalPaidOutDOT: string
  totalPaidOutStable: string
}

// -------------------------------------------------------------
//  Frontend-only extensions  (not in the contract)
// -------------------------------------------------------------

/**
 * Token metadata for display purposes.
 * Not stored in the contract — derived from the paymentToken address.
 */
export interface Token {
  id: string        // e.g. 'dot', 'usdc', 'usdt'
  symbol: string
  address: string   // matches paymentToken on the contract (address(0) = DOT)
  decimals: number  // 10 for DOT, 6 for USDC/USDT
  chainId: number
  logo?: string
}

/**
 * Enriched bounty for UI rendering.
 * Extends ContractBounty with resolved token metadata and
 * optional display-only fields.
 */
export interface Bounty extends ContractBounty {
  token: Token           // resolved from paymentToken address
  // Optional UI-only extras (populated off-chain / from metadata):
  creatorName?: string
  tags?: string[]
}

/**
 * Arguments for creating a bounty — matches createBounty() params.
 */
export interface CreateBountyArgs {
  title: string
  description: string
  reward: string          // uint256 as string
  paymentToken: string    // address(0) for DOT, token address for ERC20
  category: Category      // uint8
}

/**
 * Arguments for submitting work — matches submitWork() params.
 */
export interface SubmitWorkArgs {
  bountyId: string
  proofUrl: string
  notes: string
}

// -------------------------------------------------------------
//  Transaction tracking  (frontend only)
// -------------------------------------------------------------

export type TransactionType =
  | 'CREATE_BOUNTY'
  | 'SUBMIT_WORK'
  | 'APPROVE_BOUNTY'
  | 'CANCEL_BOUNTY'

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

export interface Transaction {
  hash: string
  type: TransactionType
  status: TransactionStatus
  from: string
  bountyId?: string
  amount?: string
  token?: Token
  timestamp: number
  blockNumber?: number
  gasUsed?: string
}

// -------------------------------------------------------------
//  Wallet state  (frontend only)
// -------------------------------------------------------------

export interface WalletState {
  connected: boolean
  address: string | null
  chainId: number | null
  /** Keyed by token address (use '0x0' for native DOT). */
  balance: Record<string, string>
  isLoading: boolean
  error: string | null
}

// -------------------------------------------------------------
//  Filters & sorting  (frontend only)
// -------------------------------------------------------------

export interface BountyFilters {
  status: BountyStatus[]
  paymentToken?: string     // address — filter by token
  category?: Category
  minReward?: string
  maxReward?: string
  sortBy: 'recent' | 'reward-high' | 'reward-low' | 'oldest'
  search?: string
}

// -------------------------------------------------------------
//  Analytics  (derived from contract view functions)
// -------------------------------------------------------------

export interface CurrencyStats {
  dotBounties: number
  tokenBounties: number[]
  tokens: string[]          // token addresses
}

// -------------------------------------------------------------
//  API / response helpers  (frontend only)
// -------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}