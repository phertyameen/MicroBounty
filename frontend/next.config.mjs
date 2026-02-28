/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@coinbase/cdp-sdk",
    "@base-org/account",
    "solana-program",
    "@solana/web3.js"
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
