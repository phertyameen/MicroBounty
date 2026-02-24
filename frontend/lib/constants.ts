import type { Token } from './types'

// Supported Networks
export const NETWORKS = {
  POLKADOT_HUB: {
    chainId: 1,
    name: 'Polkadot Hub',
    rpcUrl: 'https://rpc.polkadot.io',
    explorerUrl: 'https://explorer.polkadot.io',
  },
}

// Contract Addresses
export const CONTRACT_ADDRESSES = {
  MICROBOUNTY: '0x1234567890123456789012345678901234567890',
  ERC20_USDC: '0x0987654321098765432109876543210987654321',
  ERC20_DOT: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
}

// Supported Tokens
export const TOKENS: { [key: string]: Token } = {
  USDC: {
    id: 'usdc',
    symbol: 'USDC',
    address: CONTRACT_ADDRESSES.ERC20_USDC,
    decimals: 6,
    chainId: 1,
    logo: '💵',
  },
  DOT: {
    id: 'dot',
    symbol: 'DOT',
    address: CONTRACT_ADDRESSES.ERC20_DOT,
    decimals: 10,
    chainId: 1,
    logo: '⚫',
  },
}

// Skills for filtering/tagging
export const AVAILABLE_SKILLS = [
  'Smart Contracts',
  'Frontend Development',
  'Backend Development',
  'Full Stack',
  'DevOps',
  'Security Audit',
  'UI/UX Design',
  'Database Design',
  'API Development',
  'Testing',
  'Documentation',
  'Community Management',
]

// Bounty Categories
export const BOUNTY_CATEGORIES = [
  'Development',
  'Design',
  'Content',
  'Testing',
  'Documentation',
  'Marketing',
  'Community',
  'Infrastructure',
]

// Status Colors
export const STATUS_COLORS = {
  OPEN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  COMPLETED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
}

// Pagination
export const ITEMS_PER_PAGE = 12
export const MAX_PAGE_SIZE = 100

// Time Constants
export const MINUTE = 60
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY

// UI Constants
export const TOAST_DURATION = 4000
export const DEBOUNCE_DELAY = 300
export const CACHE_DURATION = 5 * MINUTE

// Fee Configuration (in basis points, e.g., 250 = 2.5%)
export const PLATFORM_FEE_BPS = 250
export const CREATOR_REWARD_VERIFICATION_FEE = 100 // When approving submissions

// Form Limits
export const BOUNTY_TITLE_MAX_LENGTH = 100
export const BOUNTY_DESCRIPTION_MAX_LENGTH = 5000
export const SUBMISSION_DESCRIPTION_MAX_LENGTH = 2000
