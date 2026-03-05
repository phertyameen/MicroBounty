# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

## MicroBounty — Smart Contracts
### Stack
|                |                      |
| -------------- | -------------------- |
| Framework      | Hardhat              |
| Language       | Solidity             |
| Network        | Polkadot Hub Testnet |
| Library        | ethers.js            |
| Token Standard | ERC20                |
| Testing        | Mocha + Chai         |

### Prerequisites

- Node.js v18+

- Hardhat

- A funded wallet on Polkadot Hub Testnet

- RPC configured for:

https://eth-rpc-testnet.polkadot.io/

### Setup
```bash 
cd contract
npm install
cp .env.example .env
```

.env:

```
PRIVATE_KEY=your_wallet_private_key
POLKADOT_TESTNET_RPC=https://eth-rpc-testnet.polkadot.io/
```

⚠️ Never commit your private key.

## Deployment Flow

Deployment happens in two steps:

- Deploy mock ERC20 tokens (USDC + USDT)

- Deploy the MicroBounty contract

### 1️⃣ Deploy Mock Tokens
npx hardhat run scripts/deployMocks.js --network polkadotTestnet

Expected output:
```bash
🚀 Deploying mock tokens with account: 0xd68413bCB4e5c3A4e80054063e7904a30aaAEc89

 Deploying mock USDC...
✅ Mock USDC deployed to: 0x556Af02B5a54c52c5CD95D6dbAB9C93500d6ec1b

📋 Deploying mock USDT...
✅ Mock USDT deployed to: 0x5Cba67a3BBb4Aee3F7DdF9258c77150437fe6001

📄 Copy these into your .env file:
USDC_ADDRESS=0x556Af02B5a54c52c5CD95D6dbAB9C93500d6ec1b
USDT_ADDRESS=0x5Cba67a3BBb4Aee3F7DdF9258c77150437fe6001

📁 Token addresses saved to frontend/lib/abis/mockToken/mock-token-addresses.json
```

You can then deploy the main contract 
```bash
$ npx hardhat run scripts/deploy.js --network polkadotTestnet
```

Expected output:

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

No manual copying required. All abi's are copied automatically to the frontend

## Network Configuration
### Polkadot Hub Testnet

| Field           | Value                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| Network Name    | Polkadot Hub Testnet                                                               |
| RPC URL         | [https://eth-rpc-testnet.polkadot.io/](https://eth-rpc-testnet.polkadot.io/)       |
| Chain ID        | 420420417                                                                          |
| Currency Symbol | PAS                                                                                |
| Explorer        | [https://blockscout-testnet.polkadot.io/](https://blockscout-testnet.polkadot.io/) |


## Contract Verification
⚠️ **Note** This contract is unverified yet as it requires updates and security review

To verify:
```bash
npx hardhat verify \
  --network polkadotTestnet \
  DEPLOYED_CONTRACT_ADDRESS \
  '["USDC_ADDRESS","USDT_ADDRESS"]'
```

Example:
```bash
npx hardhat verify \
  --network polkadotTestnet \
  0x73fC6177262D64ca26A76ECbab8c1aeD97e84AC5 \
  '["0x556Af02B5a54c52c5CD95D6dbAB9C93500d6ec1b","0x5Cba67a3BBb4Aee3F7DdF9258c77150437fe6001"]'
```

## Project Structure
```
contract/
├── contracts/
│   ├── MicroBounty.sol
│   └── MockERC20.sol
├── scripts/
│   ├── deploy.js
│   └── deployMocks.js
├── test/
│   └── MicroBounty.test.js
├── hardhat.config.js
└── .env
```

## Supported Tokens

The contract constructor requires an array of supported ERC20 token addresses:

constructor(address[] memory _supportedTokens)

These tokens:

- Must follow ERC20 standard

- Must implement approve() and transferFrom()

- Are used for bounty escrow

## Key Design Decisions
### 🔒 Escrow Model

- Funds are transferred into the contract on createBounty()

- Tokens remain locked until:

- - approveBounty() → funds sent to hunter

- - cancelBounty() → funds returned to creator

- The contract never holds funds without an associated bounty.

## 🪙 Token Agnostic

### The contract supports:

- Native PAS (DOT-equivalent on Polkadot Hub)

- ERC20 tokens (USDC, USDT, etc.)

Frontend handles approval flow for ERC20.

## 🧾 Constructor-Based Token Whitelisting

- Supported tokens are set at deployment.

- This prevents malicious or unsupported token deposits.

## Local Development
### Start Local Node
```bash
npx hardhat node
```

###Deploy to Localhost
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Testing
```bash
npx hardhat test
```

With gas report:
```
REPORT_GAS=true npx hardhat test
```

### Helpful Commands
```bash
npx hardhat help
npx hardhat compile
npx hardhat test
npx hardhat node
```

## Deployment Summary (Example)
	
|          |                                            |
| -------- | ------------------------------------------ |
| Contract | MicroBounty                                |
| Network  | Polkadot Hub Testnet                       |
| Deployer | 0xd68413bCB4e5c3A4e80054063e7904a30aaAEc89 |
| Tokens   | USDC + USDT                                |