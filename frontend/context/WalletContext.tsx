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
const PAS_DECIMALS = 18;

const STABLE_DECIMALS = 6;

const USDC_ADDRESS = contractAddresses.USDC_ADDRESS;
const USDT_ADDRESS = contractAddresses.USDT_ADDRESS;

// Minimal ERC20 ABI — only what we need to read balances
const ERC20_BALANCE_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function symbol() external view returns (string)",
];

interface TokenBalance {
  raw: string; // raw bigint string for contract calls
  formatted: string; // human-readable with correct decimals
  symbol: string;
}

interface WalletContextType {
  connected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;

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
  chainError: string | null;
  clearChainError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { disconnect: appKitDisconnect } = useDisconnect();
  const { open } = useAppKit();

  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<Record<string, string>>({});
  const [formattedPasBalance, setFormattedPasBalance] = useState<string | null>(
    null,
  );
  const [chainId, setChainId] = useState<number | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [pasBalance, setPasBalance] = useState<TokenBalance | null>(null);
  const [tokenBalances, setTokenBalances] = useState<
    Record<string, TokenBalance>
  >({});
  // Add state
  const [chainError, setChainError] = useState<string | null>(null);

  // ── Core balance fetcher — reusable so we can call it on demand ────────────
  const fetchBalances = useCallback(
    async (ethersProvider: BrowserProvider, userAddress: string) => {
      try {
        // Parallel fetch: native + USDC + USDT
        const [rawPas, rawUsdc, rawUsdt, network] = await Promise.all([
          ethersProvider.getBalance(userAddress),
          new ethers.Contract(USDC_ADDRESS, ERC20_BALANCE_ABI, ethersProvider)
            .balanceOf(userAddress)
            .catch(() => BigInt(0)),
          new ethers.Contract(USDT_ADDRESS, ERC20_BALANCE_ABI, ethersProvider)
            .balanceOf(userAddress)
            .catch(() => BigInt(0)),
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
          formatted: parseFloat(
            ethers.formatUnits(rawUsdc, STABLE_DECIMALS),
          ).toFixed(2),
          symbol: "USDC",
        };

        // ── USDT ──
        const usdtBalance: TokenBalance = {
          raw: rawUsdt.toString(),
          formatted: parseFloat(
            ethers.formatUnits(rawUsdt, STABLE_DECIMALS),
          ).toFixed(2),
          symbol: "USDT",
        };

        setTokenBalances({
          [USDC_ADDRESS.toLowerCase()]: usdcBalance,
          [USDT_ADDRESS.toLowerCase()]: usdtBalance,
        });
      } catch (error) {
        console.error("Failed to fetch balances:", error);
      }
    },
    [],
  );

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
        return;
      }

      try {
        const ethersProvider = new BrowserProvider(
          walletProvider as ethers.Eip1193Provider,
        );

        const ethersSigner = await ethersProvider.getSigner();
        setSigner(ethersSigner);
        // await fetchBalances(ethersProvider, address);
        fetchBalances(ethersProvider, address).catch((err) => {
          console.warn("Balance fetch failed silently:", err);
        });
      } catch (error) {
        console.error("Failed to setup wallet:", error);
        setSigner(null);
        setBalance({});
        setFormattedPasBalance(null);
        setPasBalance(null);
        // setTokenBalances({});
      }
    };

    setup();
  }, [walletProvider, address, fetchBalances]);

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
    if (isConnecting) return;
    setIsConnecting(true);
    setChainError(null);
    try {
      // Check if the chain is already added to MetaMask before opening AppKit
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          await (window.ethereum as any).request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x190f1b41" }],
          });
        } catch (switchError: any) {
          if (switchError?.code === 4902) {
            // Chain not added — show our UI instead of calling open()
            setChainError("unrecognized_chain");
            setIsConnecting(false);
            return; // ← stop here, don't call open()
          }
          // Any other switch error (e.g. user rejected), ignore and proceed
        }
      }

      await open();
    } catch (error: any) {
      if (
        error?.code === 4902 ||
        error?.message?.includes("Unrecognized chain")
      ) {
        setChainError("unrecognized_chain");
      } else {
        console.warn("Wallet connection failed:", error);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [open, isConnecting]);

  const clearChainError = useCallback(() => setChainError(null), []);

  const disconnect = useCallback(async () => {
    try {
      await appKitDisconnect();
      setBalance({});
      setFormattedPasBalance(null);
      setPasBalance(null);
      setTokenBalances({});
      setSigner(null);
      setChainId(null);
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
    pasBalance,
    tokenBalances,
    balance,
    formattedPasBalance,
    signer,
    connect,
    disconnect,
    updateBalance,
    refreshBalances,
    chainError,
    clearChainError,
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
