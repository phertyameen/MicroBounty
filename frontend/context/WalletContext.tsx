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
} from "@reown/appkit/react";
import { BrowserProvider, JsonRpcSigner, ethers } from "ethers";
import { Toaster } from "sonner";

// address(0) key used for native PAS balance, consistent with BountyContext
const DOT_ADDRESS = "0x0000000000000000000000000000000000000000";

/** PAS uses 10 decimals, not 18 like ETH */
const PAS_DECIMALS = 10;

interface WalletContextType {
  connected: boolean;
  isConnecting: boolean;
  address: string | null;
  chainId: number | null;
  /** Balances keyed by token address (DOT_ADDRESS for native PAS).
   *  Values are raw wei strings — use formatUnits(val, 10) to display. */
  balance: Record<string, string>;
  /** Human-readable PAS balance (already formatted with 10 decimals) */
  formattedPasBalance: string | null;
  signer: JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  updateBalance: (tokenAddress: string, balance: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { disconnect: appKitDisconnect } = useDisconnect();
  const { open } = useAppKit();

  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<Record<string, string>>({});
  const [formattedPasBalance, setFormattedPasBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  useEffect(() => {
    const setup = async () => {
      if (!walletProvider || !address) {
        setBalance({});
        setFormattedPasBalance(null);
        setSigner(null);
        setChainId(null);
        return;
      }

      try {
        const ethersProvider = new BrowserProvider(
          walletProvider as ethers.Eip1193Provider,
        );

        const [ethersSigner, rawBalance, network] = await Promise.all([
          ethersProvider.getSigner(),
          ethersProvider.getBalance(address),
          ethersProvider.getNetwork(),
        ]);

        setSigner(ethersSigner);
        setChainId(Number(network.chainId));

        // Store raw wei string for contract interactions
        setBalance({ [DOT_ADDRESS]: rawBalance.toString() });

        // Store human-readable balance using 10 decimals (PAS, not ETH)
        setFormattedPasBalance(
          parseFloat(ethers.formatUnits(rawBalance, PAS_DECIMALS)).toFixed(4),
        );
      } catch (error) {
        console.error("Failed to setup provider:", error);
        setSigner(null);
        setBalance({});
        setFormattedPasBalance(null);
      }
    };

    setup();
  }, [walletProvider, address]);

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
    balance,
    formattedPasBalance,
    signer,
    connect,
    disconnect,
    updateBalance,
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