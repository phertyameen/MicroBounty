"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { defineChain } from "@reown/appkit/networks";

// Polkadot Hub Testnet
export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub Testnet",
  nativeCurrency: {
    name: "DOT",
    symbol: "DOT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Subscan",
      url: "https://assethub-westend.subscan.io",
    },
  },
  testnet: true,
});

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!;

const metadata = {
  name: "MicroBounty",
  description: "A Multi-Currency Bounty Payment Platform for Polkadot Ecosystem",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  icons: ["/favicon.ico"],
};

createAppKit({
  adapters: [new EthersAdapter()],
  metadata,
  networks: [polkadotHubTestnet],
  defaultNetwork: polkadotHubTestnet,
  projectId,
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});

export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}