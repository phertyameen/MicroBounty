"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import contractAddresses from "@/lib/abis/contract-addresses.json";
import { toast } from "sonner";

const USDC_ADDRESS = contractAddresses.USDC_ADDRESS;
const USDT_ADDRESS = contractAddresses.USDT_ADDRESS;

export function AddNetworkButton() {
  const { chainError, clearChainError, connect } = useWallet();

  if (chainError !== "unrecognized_chain") return null;

  const addNetwork = async () => {
    try {
      await (window.ethereum as any).request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x190f1b41",
            chainName: "Polkadot Hub Testnet",
            nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
            rpcUrls: ["https://eth-rpc-testnet.polkadot.io/"],
            blockExplorerUrls: ["https://blockscout-testnet.polkadot.io/"],
          },
        ],
      });

      // Silently try to import USDC and USDT — failure is non-fatal
      Promise.allSettled([
        (window.ethereum as any).request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: { address: USDC_ADDRESS, symbol: "USDC", decimals: 6 },
          },
        }),
        (window.ethereum as any).request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: { address: USDT_ADDRESS, symbol: "USDT", decimals: 6 },
          },
        }),
      ]).catch(() => {
        toast.info("Network added. Import USDC/USDT manually if needed.");
      });

      clearChainError();
      await connect(); // retry connection after adding
    } catch (err) {
      console.error("Failed to add network:", err);
      toast.error('Failed to add network. Please try manually.')
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-card border border-border rounded-lg shadow-lg p-4 space-y-3">
      <div>
        <p className="font-semibold text-sm">Network not found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Polkadot Hub Testnet is not added to your wallet. Add it to continue.
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={addNetwork} className="flex-1">
          Add Polkadot Hub Testnet
        </Button>
        <Button size="sm" variant="outline" onClick={clearChainError}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
