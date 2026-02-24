import type { Configuration } from "webpack";

const nextConfig = {
  webpack: (config: Configuration) => {
    if (Array.isArray(config.externals)) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }
    return config;
  },
};

module.exports = nextConfig;