require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

private_key = process.env.PRIVATE_KEY;
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  sourcify: {
    enabled: true,
  },
  networks: {
    polkadotTestnet: {
      url: "https://eth-rpc-testnet.polkadot.io/",
      chainId: 420420417,
      accounts: private_key ? [private_key] : [],
    },
    local: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      polkadotTestnet: "5a493b05544bd278f1ed63fe702ca486", 
    },
    customChains: [
      {
        network: "polkadotTestnet",
        chainId: 420420417,
        urls: {
          apiURL: "https://blockscout-testnet.polkadot.io/api",
          browserURL: "https://blockscout-testnet.polkadot.io",
        },
      },
    ],
  },
};
