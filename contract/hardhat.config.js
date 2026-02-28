require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

private_key = process.env.PRIVATE_KEY
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
  networks: {
    polkadotTestnet: {
      url: 'https://services.polkadothub-rpc.com/testnet',
      chainId: 420420417,
      accounts: [private_key],
    },
    local: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
};
