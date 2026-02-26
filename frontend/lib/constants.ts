import { Token } from "./types";

export const NETWORKS = {
  POLKADOT_HUB_TESTNET: {
    chainId: 420420417,
    name: "Polkadot Hub Testnet",
    rpcUrl: "https://testnet-passet-hub-eth-rpc.polkadot.io",
    explorerUrl: "https://assethub-westend.subscan.io",
  },
};

export const CONTRACT_ADDRESSES = {
  MICROBOUNTY: process.env.NEXT_PUBLIC_MICROBOUNTY_ADDRESS ?? "",
  ERC20_USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "",
  ERC20_USDT: process.env.NEXT_PUBLIC_USDT_ADDRESS ?? "",
};

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
    address: CONTRACT_ADDRESSES.ERC20_USDC,
    decimals: 6,
    chainId: 420420417,
    logo: "💵",
  },
  USDT: {
    id: "usdt",
    symbol: "USDT",
    address: CONTRACT_ADDRESSES.ERC20_USDT,
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
