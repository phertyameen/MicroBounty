/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: "loose"
  },
  serverExternalPackages: [
    "@coinbase/cdp-sdk",
    "@base-org/account"
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
