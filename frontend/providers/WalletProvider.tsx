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

interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  account: string | null;
  balance: string | null;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signer: JsonRpcSigner | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, caipAddress } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  // Fetch balance and signer when provider/address changes
  useEffect(() => {
    const setup = async () => {
      if (!walletProvider || !address) {
        setBalance(null);
        setSigner(null);
        setChainId(null);
        return;
      }

      try {
        const ethersProvider = new BrowserProvider(walletProvider as any);

        // Get signer
        const ethersSigner = await ethersProvider.getSigner();
        setSigner(ethersSigner);

        // Get balance
        const balanceWei = await ethersProvider.getBalance(address);
        setBalance(parseFloat(ethers.formatEther(balanceWei)).toFixed(4));

        // Get chainId
        const network = await ethersProvider.getNetwork();
        setChainId(Number(network.chainId));
      } catch (error) {
        console.error("Failed to setup provider:", error);
        setSigner(null);
        setBalance("0");
      }
    };

    setup();
  }, [walletProvider, address]);

  const connectWallet = useCallback(async () => {
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

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
      throw error;
    }
  }, [disconnect]);

  const value: WalletContextType = {
    isConnected,
    isConnecting,
    address: address ?? null,
    account: address ?? null,
    balance,
    chainId,
    connectWallet,
    disconnectWallet,
    signer,
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