// Bounty Status
export enum BountyStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// User Roles
export enum UserRole {
  CREATOR = 'CREATOR',
  WORKER = 'WORKER',
  REVIEWER = 'REVIEWER',
  BOTH = 'BOTH', // Can create and work on bounties
}

// Token Types
export interface Token {
  id: string;
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
  logo?: string;
}

// Bounty Model
export interface Bounty {
  id: string;
  title: string;
  description: string;
  status: BountyStatus;
  creatorAddress: string;
  creatorName?: string;
  budget: string; // wei/smallest unit
  token: Token;
  skills: string[];
  deadline: number; // timestamp
  createdAt: number;
  updatedAt: number;
  submissionCount: number;
  acceptedSubmissionId?: string;
  tags?: string[];
  category?: string;
}

// Submission Model
export interface Submission {
  id: string;
  bountyId: string;
  workerAddress: string;
  workerName?: string;
  description: string;
  submittedAt: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  attachments?: string[];
}

// Transaction Model
export interface Transaction {
  hash: string;
  type: 'CREATE_BOUNTY' | 'SUBMIT_WORK' | 'APPROVE_SUBMISSION' | 'CANCEL_BOUNTY' | 'CLAIM_REWARD';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  from: string;
  bountyId?: string;
  amount?: string;
  token?: Token;
  timestamp: number;
  blockNumber?: number;
  gasUsed?: string;
}

// Analytics
export interface PlatformAnalytics {
  totalBounties: number;
  activeBounties: number;
  totalValue: string;
  totalSubmissions: number;
  averageBountyValue: string;
  topCreators: Creator[];
  topWorkers: Worker[];
  bountyTrend: TrendData[];
}

export interface Creator {
  address: string;
  name?: string;
  bountiesCreated: number;
  totalSpent: string;
  averageValue: string;
}

export interface Worker {
  address: string;
  name?: string;
  submissionsCount: number;
  acceptanceRate: number;
  totalEarned: string;
  averageEarning: string;
}

export interface TrendData {
  date: string;
  bounties: number;
  submissions: number;
  value: string;
}

// Wallet State
export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  balance: { [tokenId: string]: string };
  isLoading: boolean;
  error: string | null;
}

// Filter Model
export interface BountyFilters {
  status: BountyStatus[];
  tokenId?: string;
  minBudget?: string;
  maxBudget?: string;
  skills?: string[];
  sortBy: 'recent' | 'budget-high' | 'budget-low' | 'deadline';
  search?: string;
}

// Response Models
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
