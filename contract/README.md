# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```bash
# Deploy the mock usdt and usdc addresses
npx hardhat run scripts/deployMocks.js --network polkadotTestnet
```

You should see a responce of 
```bash
🚀 Deploying mock tokens with account: 0xd68413bCB4e5c3A4e80054063e7904a30aaAEc89

 Deploying mock USDC...
✅ Mock USDC deployed to: 0x556Af02B5a54c52c5CD95D6dbAB9C93500d6ec1b

📋 Deploying mock USDT...
✅ Mock USDT deployed to: 0x5Cba67a3BBb4Aee3F7DdF9258c77150437fe6001

📄 Copy these into your .env file:
USDC_ADDRESS=0x556Af02B5a54c52c5CD95D6dbAB9C93500d6ec1b
USDT_ADDRESS=0x5Cba67a3BBb4Aee3F7DdF9258c77150437fe6001

📁 Token addresses saved to frontend/lib/abis/mock-token-addresses.json
```

You can then deploy the main contract 
```bash
$ npx hardhat run scripts/deploy.js --network polkadotTestnet
```

and should receive a response of:

```bash
🚀 Deploying with account: 0xd68413bCB4e5c3A4e80054063e7904a30aaAEc89
💰 Account balance: 3994704371948500000000

📋 Deploying MicroBounty...
   Supported tokens: [
  '0x556Af02B5a54c52c5CD95D6dbAB9C93500d6ec1b',
  '0x5Cba67a3BBb4Aee3F7DdF9258c77150437fe6001'
]
✅ MicroBounty deployed to: 0x026e4CE2F16E5d63613df64DEB08F55cf5d0ccEA

📁 Saved contract-addresses.json
📁 Saved MicroBounty.json
📁 All contract files saved to frontend/lib/abis/

🎉 MicroBounty deployed and saved successfully!

 Deployment Summary:
   Contract : MicroBounty
   Address  : 0x73fC6177262D64ca26A76ECbab8c1aeD97e84AC5
   Network  : polkadotTestnet
   Deployer : 0xd68413bCB4e5c3A4e80054063e7904a30aaAEc89
   Tokens   : 0x556Af02B5a54c52c5CD95D6dbAB9C93500d6ec1b, 0x5Cba67a3BBb4Aee3F7DdF9258c77150437fe6001
```

## Other helpful commands 

### In the terminal

```bash
npx hardhat help
npx hardhat compile
npx hardhat test
Deploy to Polkadot Hub Testnet
npx hardhat run scripts/deploy.js --network polkadotHub

REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js

# Deploy to Localhost (for local testing)
# Terminal 1 — start local node
npx hardhat node

# Terminal 2 — deploy to it
npx hardhat run scripts/deploy.js --network localhost
```