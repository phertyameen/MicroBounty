import { Token } from "./types";
import contractAddresses from '@/lib/abis/contract-addresses.json'


export const NETWORKS = {
  POLKADOT_HUB_TESTNET: {
    chainId: 420420417,
    name: "Polkadot Hub Testnet",
    rpcUrl: "https://eth-rpc-testnet.polkadot.io/",
    explorerUrl: "https://assethub-westend.subscan.io",
  },
};

export const MIN_REWARD_RAW = {
  PAS:  BigInt('1000000000000'), // 100 PAS  × 10^10
  USDC: BigInt('100000000'),     // 100 USDC × 10^6
  USDT: BigInt('100000000'),     // 100 USDT × 10^6
}

export const MIN_REWARD_HUMAN = {
  PAS:  '100',
  USDC: '100',
  USDT: '100',
}

export const TOKENS: { [key: string]: Token } = {
  DOT: {
    id: "pas",
    symbol: "PAS",
    address: "0x0000000000000000000000000000000000000000", // native, not ERC20
    decimals: 10,
    chainId: 420420417,
    logo: "⚫",
  },
  USDC: {
    id: "usdc",
    symbol: "USDC",
    address: contractAddresses.USDC_ADDRESS,
    decimals: 6,
    chainId: 420420417,
    logo: "💵",
  },
  USDT: {
    id: "usdt",
    symbol: "USDT",
    address: contractAddresses.USDT_ADDRESS,
    decimals: 6,
    chainId: 420420417,
    logo: "💲",
  },
};

export const STATUS_COLORS = {
  OPEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  COMPLETED:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

export const BOUNTY_DESCRIPTION_MAX_LENGTH = 500;
export const BOUNTY_TITLE_MAX_LENGTH = 100;
export const SUBMISSION_NOTES_MAX_LENGTH = 200;
