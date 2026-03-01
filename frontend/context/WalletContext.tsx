"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  useAppKitAccount,
  useAppKitProvider,
  useDisconnect,
  useAppKit,
  useAppKitState,
} from "@reown/appkit/react";
import { BrowserProvider, JsonRpcSigner, ethers } from "ethers";
import { Toaster } from "sonner";
import contractAddresses from "@/lib/abis/contract-addresses.json";

// address(0) key used for native PAS balance, consistent with BountyContext
const DOT_ADDRESS = "0x0000000000000000000000000000000000000000";

/** PAS uses 10 decimals, not 18 like ETH */
const PAS_DECIMALS = 10;

const STABLE_DECIMALS = 6;

const USDC_ADDRESS = contractAddresses.USDC_ADDRESS;
const USDT_ADDRESS = contractAddresses.USDT_ADDRESS;

// Minimal ERC20 ABI — only what we need to read balances
const ERC20_BALANCE_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function symbol() external view returns (string)",
];

interface TokenBalance {
  raw: string;        // raw bigint string for contract calls
  formatted: string;  // human-readable with correct decimals
  symbol: string;
}

interface WalletContextType {
  connected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  walletName: string | null;

  /** Native PAS balance */
  pasBalance: TokenBalance | null;

  /** Stablecoin balances keyed by token address */
  tokenBalances: Record<string, TokenBalance>;

  /** Raw balances keyed by token address (legacy — kept for BountyContext compat) */
  balance: Record<string, string>;

  /** Human-readable PAS balance (legacy — kept for existing UI compat) */
  formattedPasBalance: string | null;

  signer: JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  updateBalance: (tokenAddress: string, balance: string) => void;

  /** Manually trigger a balance refresh (call after create/approve/cancel) */
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { disconnect: appKitDisconnect } = useDisconnect();
  const { open } = useAppKit();

  // useAppKitState gives us the active connector name (e.g. "MetaMask")
  const appKitState = useAppKitState();

  const [isConnecting, setIsConnecting]     = useState(false);
  const [balance, setBalance]               = useState<Record<string, string>>({});
  const [formattedPasBalance, setFormattedPasBalance] = useState<string | null>(null);
  const [chainId, setChainId]               = useState<number | null>(null);
  const [signer, setSigner]                 = useState<JsonRpcSigner | null>(null);
  const [walletName, setWalletName]         = useState<string | null>(null);
  const [pasBalance, setPasBalance]         = useState<TokenBalance | null>(null);
  const [tokenBalances, setTokenBalances]   = useState<Record<string, TokenBalance>>({});

  // ── Derive wallet name from the injected provider or AppKit state ──────────
  const resolveWalletName = useCallback((): string | null => {
    // AppKit exposes the active connector name via state
    if (appKitState?.activeChain) {
      // Try window.ethereum provider info first (EIP-6963)
      const win = window as unknown as {
        ethereum?: { providerInfo?: { name?: string }; isMetaMask?: boolean; isCoinbaseWallet?: boolean; isRabby?: boolean; isBraveWallet?: boolean }
      };

      if (win.ethereum?.providerInfo?.name) return win.ethereum.providerInfo.name;
      if (win.ethereum?.isMetaMask)        return "MetaMask";
      if (win.ethereum?.isCoinbaseWallet)  return "Coinbase Wallet";
      if (win.ethereum?.isRabby)           return "Rabby";
      if (win.ethereum?.isBraveWallet)     return "Brave Wallet";
    }
    return null;
  }, [appKitState]);

  // ── Core balance fetcher — reusable so we can call it on demand ────────────
  const fetchBalances = useCallback(async (
    ethersProvider: BrowserProvider,
    userAddress: string,
  ) => {
    try {
      // Parallel fetch: native + USDC + USDT
      const [rawPas, rawUsdc, rawUsdt, network] = await Promise.all([
        ethersProvider.getBalance(userAddress),
        new ethers.Contract(USDC_ADDRESS, ERC20_BALANCE_ABI, ethersProvider)
          .balanceOf(userAddress),
        new ethers.Contract(USDT_ADDRESS, ERC20_BALANCE_ABI, ethersProvider)
          .balanceOf(userAddress),
        ethersProvider.getNetwork(),
      ]);

      setChainId(Number(network.chainId));

      // ── PAS ──
      const formattedPas = parseFloat(
        ethers.formatUnits(rawPas, PAS_DECIMALS),
      ).toFixed(4);

      setPasBalance({
        raw: rawPas.toString(),
        formatted: formattedPas,
        symbol: "PAS",
      });

      // Legacy fields (BountyContext compat)
      setBalance({ [DOT_ADDRESS]: rawPas.toString() });
      setFormattedPasBalance(formattedPas);

      // ── USDC ──
      const usdcBalance: TokenBalance = {
        raw: rawUsdc.toString(),
        formatted: parseFloat(ethers.formatUnits(rawUsdc, STABLE_DECIMALS)).toFixed(2),
        symbol: "USDC",
      };

      // ── USDT ──
      const usdtBalance: TokenBalance = {
        raw: rawUsdt.toString(),
        formatted: parseFloat(ethers.formatUnits(rawUsdt, STABLE_DECIMALS)).toFixed(2),
        symbol: "USDT",
      };

      setTokenBalances({
        [USDC_ADDRESS.toLowerCase()]: usdcBalance,
        [USDT_ADDRESS.toLowerCase()]: usdtBalance,
      });
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    }
  }, []);

  // ── Main setup effect — runs when wallet connects / address changes ─────────
  useEffect(() => {
    const setup = async () => {
      if (!walletProvider || !address) {
        setBalance({});
        setFormattedPasBalance(null);
        setPasBalance(null);
        setTokenBalances({});
        setSigner(null);
        setChainId(null);
        setWalletName(null);
        return;
      }

      try {
        const ethersProvider = new BrowserProvider(
          walletProvider as ethers.Eip1193Provider,
        );

        const ethersSigner = await ethersProvider.getSigner();
        setSigner(ethersSigner);
        setWalletName(resolveWalletName());
        await fetchBalances(ethersProvider, address);
      } catch (error) {
        console.error("Failed to setup wallet:", error);
        setSigner(null);
        setBalance({});
        setFormattedPasBalance(null);
        setPasBalance(null);
        setTokenBalances({});
      }
    };

    setup();
  }, [walletProvider, address, resolveWalletName, fetchBalances]);

  // ── Public refresh — call this after any on-chain write ───────────────────
  const refreshBalances = useCallback(async () => {
    if (!walletProvider || !address) return;
    try {
      const ethersProvider = new BrowserProvider(
        walletProvider as ethers.Eip1193Provider,
      );
      await fetchBalances(ethersProvider, address);
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    }
  }, [walletProvider, address, fetchBalances]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await open();
    } catch (error) {
      console.error("Failed to open wallet modal:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [open]);

  const disconnect = useCallback(async () => {
    try {
      await appKitDisconnect();
      setBalance({});
      setFormattedPasBalance(null);
      setPasBalance(null);
      setTokenBalances({});
      setSigner(null);
      setChainId(null);
      setWalletName(null);
    } catch (error) {
      console.error("Failed to disconnect:", error);
      throw error;
    }
  }, [appKitDisconnect]);

  const updateBalance = useCallback((tokenAddress: string, amount: string) => {
    setBalance((prev) => ({ ...prev, [tokenAddress]: amount }));
  }, []);

  const value: WalletContextType = {
    connected: isConnected,
    isConnecting,
    address: address ?? null,
    chainId,
    walletName,
    pasBalance,
    tokenBalances,
    balance,
    formattedPasBalance,
    signer,
    connect,
    disconnect,
    updateBalance,
    refreshBalances,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
      <Toaster richColors />
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

export { DOT_ADDRESS, PAS_DECIMALS };