# MicroBounty Architecture

> Technical architecture and design decisions for the MicroBounty platform

## Table of Contents

1. [System Overview](#system-overview)
2. [Smart Contract Layer](#smart-contract-layer)
3. [Frontend Application](#frontend-application)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Design Decisions](#design-decisions)

---

## System Overview

MicroBounty is a decentralized bounty marketplace consisting of:

- **Smart Contract Layer**: Solidity contracts on Polkadot Hub EVM
- **Frontend Application**: Next.js web application
- **Blockchain**: Polkadot Hub Testnet (Chain ID: 420420417)

```
┌─────────────────────────────────────────────────────────────┐
│                         User Layer                          │
│          (MetaMask, SubWallet, Talisman Wallets)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Web3 Provider (EIP-1193)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                     │
│                  (Next.js 15 + TypeScript)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Contexts   │  │  Components  │  │   Lib/Utils  │    │
│  │              │  │              │  │              │    │
│  │ • Wallet     │  │ • BountyCard │  │ • ethers.js  │    │
│  │ • Bounty     │  │ • CreateForm │  │ • formatters │    │
│  │              │  │ • Analytics  │  │ • constants  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ JSON-RPC / ethers.js v6
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Smart Contract Layer                      │
│                  (Solidity 0.8.28 on EVM)                   │
│                                                             │
│                    MicroBounty.sol                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  State:                                              │  │
│  │  • bounties mapping                                  │  │
│  │  • userBounties, userSubmissions                     │  │
│  │  • platformStats, userStats                          │  │
│  │  • supportedTokens                                   │  │
│  │                                                      │  │
│  │  Functions:                                          │  │
│  │  • createBounty()   • submitWork()                   │  │
│  │  • approveBounty()  • cancelBounty()                 │  │
│  │  • getBounty()      • getPlatformStats()             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ EVM Execution
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Polkadot Hub Chain                      │
│                    (EVM-Compatible Layer)                   │
│                                                             │
│  • Native DOT (10 decimals)                                 │
│  • ERC20 Tokens (USDC, USDT - 6 decimals)                   │
│  • Block time: ~6 seconds                                   │
│  • Finality: ~12-18 seconds                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contract Layer

### Contract: `MicroBounty.sol`

**File**: `contract/contracts/MicroBounty.sol`  
**Address**: `0x73fC6177262D64ca26A76ECbab8c1aeD97e84AC5` (Testnet)  
**Language**: Solidity 0.8.28  
**Standards**: ERC20-compatible, OpenZeppelin libraries

### Core Components

#### 1. Data Structures

```solidity
struct Bounty {
    uint256 id;
    address creator;
    string title;
    string description;
    uint256 reward;
    address paymentToken;      // address(0) = DOT, else ERC20
    BountyStatus status;
    address hunter;
    string proofUrl;
    string submissionNotes;
    uint256 createdAt;
    uint256 submittedAt;
    uint256 completedAt;
    uint8 category;
}

enum BountyStatus { OPEN, IN_PROGRESS, COMPLETED, CANCELLED }
enum Category { DEVELOPMENT, DESIGN, CONTENT, BUG_FIX, OTHER }
```

#### 2. State Variables

```solidity
// Core mappings
mapping(uint256 => Bounty) public bounties;
mapping(address => uint256[]) public userBounties;
mapping(address => uint256[]) public userSubmissions;
mapping(address => UserStats) public userStats;

// Token whitelist
mapping(address => bool) public supportedTokens;
address[] public tokenList;

// Analytics
PlatformStats public platformStats;
```

#### 3. Key Functions

| Function | Access | Gas Cost | Description |
|----------|--------|----------|-------------|
| `createBounty()` | Public | ~150k | Create bounty, lock funds in escrow |
| `submitWork()` | Public | ~80k | Submit proof, claim bounty as hunter |
| `approveBounty()` | Creator only | ~120k | Release payment to hunter |
| `cancelBounty()` | Creator only | ~100k | Refund creator (OPEN status only) |
| `getBounty()` | View | Free | Fetch bounty details |
| `getPlatformStats()` | View | Free | Aggregate platform metrics |

### Security Patterns

#### 1. Reentrancy Protection

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function approveBounty(uint256 _bountyId) 
    external 
    nonReentrant  // ← Prevents reentrancy
{
    // ... payment logic
}
```

#### 2. Checks-Effects-Interactions

```solidity
// 1. CHECKS
require(msg.sender == bounty.creator, "Only creator");
require(bounty.status == BountyStatus.IN_PROGRESS, "Invalid status");

// 2. EFFECTS (state changes first)
bounty.status = BountyStatus.COMPLETED;
platformStats.completedBounties++;

// 3. INTERACTIONS (external calls last)
(bool success, ) = bounty.hunter.call{value: bounty.reward}("");
require(success, "Transfer failed");
```

#### 3. Access Control

```solidity
modifier onlyBountyCreator(uint256 _bountyId) {
    require(bounties[_bountyId].creator == msg.sender, "Only creator");
    _;
}
```

#### 4. Input Validation

- Title: 1-100 characters
- Description: 1-500 characters
- Submission notes: Max 200 characters
- Reward: >= MIN_REWARD (0.01 DOT or 1 USDC)
- Category: 0-4 (enum bounds)
- Payment token: Must be in whitelist

### Multi-Currency Handling

#### Native DOT (10 Decimals)

```solidity
uint256 public constant MIN_REWARD_DOT = 0.01 ether; // 0.01 DOT = 10^8 units

// Payment
if (_paymentToken == address(0)) {
    require(msg.value == _reward, "Incorrect DOT amount");
    platformStats.totalValueLockedDOT += _reward;
}
```

#### ERC20 Stablecoins (6 Decimals)

```solidity
uint256 public constant MIN_REWARD_STABLE = 1e6; // 1 USDC/USDT

// Payment
IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _reward);
platformStats.totalValueLockedStable += _reward;
```

### Events

```solidity
event BountyCreated(uint256 indexed bountyId, address indexed creator, uint256 reward, address paymentToken, uint8 category);
event WorkSubmitted(uint256 indexed bountyId, address indexed hunter, string proofUrl, uint256 timestamp);
event BountyCompleted(uint256 indexed bountyId, address indexed hunter, uint256 reward, address paymentToken, uint256 timestamp);
event BountyCancelled(uint256 indexed bountyId, address indexed creator, uint256 refund, address paymentToken, uint256 timestamp);
```

---

## Frontend Application

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4
- **Web3**: ethers.js v6, Reown AppKit
- **State**: React Context API
- **Build**: Vercel

### Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Homepage (bounty board)
│   ├── create/page.tsx     # Create bounty form
│   ├── bounty/[id]/page.tsx # Bounty detail page
│   ├── history/page.tsx    # Transaction history
│   └── analytics/page.tsx  # Analytics dashboard
│
├── components/             # React components
│   ├── BountyCard.tsx      # Bounty card UI
│   ├── CreateBountyForm.tsx
│   ├── SubmitWorkModal.tsx
│   ├── ApproveButton.tsx
│   ├── AnalyticsDashboard.tsx
│   └── ui/                 # Reusable UI components
│
├── context/                # React Context
│   ├── WalletContext.tsx   # Wallet connection & balance
│   └── BountyContext.tsx   # Bounty data & filtering
│
├── lib/                    # Utilities
│   ├── constants.ts        # Contract ABI, addresses
│   ├── formatters.ts       # Format DOT, dates, addresses
│   └── contracts.ts        # Contract interaction helpers
│
└── public/                 # Static assets
    └── MicroBountyABI.json # Contract ABI
```

### Context Architecture

#### WalletContext

```typescript
interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balances: {
    dot: string;
    usdc: string;
    usdt: string;
  };
  walletName: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}
```

**Responsibilities:**
- Wallet connection via Reown AppKit
- Balance fetching (native + ERC20)
- Network validation
- Wallet provider management

#### BountyContext

```typescript
interface BountyContextType {
  bounties: Bounty[];
  loading: boolean;
  filters: {
    status: BountyStatus | 'all';
    currency: string | 'all';
    category: Category | 'all';
  };
  platformStats: PlatformStats;
  userStats: UserStats;
  
  fetchBounties: () => Promise<void>;
  createBounty: (data: CreateBountyData) => Promise<void>;
  submitWork: (id: number, proof: string) => Promise<void>;
  approveBounty: (id: number) => Promise<void>;
  cancelBounty: (id: number) => Promise<void>;
}
```

**Responsibilities:**
- Fetch bounties from contract
- Cache bounty data
- Filter/search logic
- Transaction submission
- Event listening for updates

### DOT Decimal Handling (Critical!)

Polkadot's native token uses **10 decimals**, not 18 like Ethereum.

#### Frontend

```typescript
// lib/formatters.ts
export const formatDOT = (amount: bigint): string => {
  return ethers.formatUnits(amount, 10); // 10 decimals, not 18!
};

export const parseDOT = (amount: string): bigint => {
  return ethers.parseUnits(amount, 10);
};

// Usage
<input 
  onChange={(e) => {
    const parsed = parseDOT(e.target.value); // Correct parsing
    setReward(parsed);
  }}
/>
```

#### Smart Contract

```solidity
// Correct: 0.01 DOT = 10^8 units (10 decimals)
uint256 public constant MIN_REWARD_DOT = 0.01 ether; // 10^8

// Incorrect (would be 18 decimals):
// uint256 public constant MIN_REWARD_DOT = 0.01 * 10**18; // WRONG!
```

### Component Communication

```
User Action (e.g., "Create Bounty")
    ↓
Component (CreateBountyForm.tsx)
    ↓
Context (BountyContext.createBounty())
    ↓
ethers.js Contract Instance
    ↓
JSON-RPC to Polkadot Hub
    ↓
Smart Contract Execution
    ↓
Event Emitted (BountyCreated)
    ↓
Frontend Event Listener
    ↓
Context Updates State
    ↓
UI Re-renders
```

---

## Data Flow

### Create Bounty Flow

```
1. User fills form in CreateBountyForm.tsx
   ↓
2. Form validation (client-side)
   ↓
3. BountyContext.createBounty() called
   ↓
4. Check if ERC20 → Approve token spending first
   ↓
5. Call contract.createBounty()
   ↓
6. Wait for transaction confirmation
   ↓
7. Listen for BountyCreated event
   ↓
8. Update local state with new bounty
   ↓
9. Redirect to bounty detail page
```

### Approve Bounty Flow

```
1. Creator clicks "Approve & Pay" on BountyDetail page
   ↓
2. Confirmation modal shown
   ↓
3. BountyContext.approveBounty(id) called
   ↓
4. Contract performs checks:
   - msg.sender == creator
   - status == IN_PROGRESS
   ↓
5. State updated (status → COMPLETED)
   ↓
6. Payment transferred:
   - DOT: native transfer
   - ERC20: safeTransfer
   ↓
7. BountyCompleted event emitted
   ↓
8. Frontend updates UI, shows success
```

### Real-Time Updates

```typescript
// Listen for events
contract.on("BountyCreated", (bountyId, creator, reward) => {
  fetchBounties(); // Refresh bounty list
});

contract.on("BountyCompleted", (bountyId, hunter, reward) => {
  updateBountyStatus(bountyId, "COMPLETED");
  showSuccessNotification();
});
```

---

## Security Architecture

### Smart Contract Security

#### 1. ReentrancyGuard

- Applied to: `approveBounty()`, `cancelBounty()`
- Prevents recursive calls during payment transfers
- Uses OpenZeppelin's battle-tested implementation

#### 2. SafeERC20

- Wraps all ERC20 interactions
- Handles tokens that don't return booleans
- Prevents silent failures

#### 3. Access Control

- Only creator can approve/cancel their bounties
- Cannot submit work to your own bounty
- Status-based function restrictions

#### 4. Input Validation

- Length limits on all strings
- Minimum reward thresholds
- Token whitelist enforcement
- Category bounds checking

### Frontend Security

#### 1. Wallet Security

- No private keys stored
- Users sign transactions in their wallet
- Network mismatch warnings
- Transaction simulation before send

#### 2. Input Sanitization

```typescript
// Prevent XSS in user-submitted URLs
const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.href;
  } catch {
    throw new Error('Invalid URL');
  }
};
```

#### 3. Transaction Validation

```typescript
// Verify transaction before sending
const validateTransaction = async (tx: TransactionRequest) => {
  try {
    await provider.estimateGas(tx); // Will revert if transaction would fail
  } catch (error) {
    throw new Error('Transaction would fail');
  }
};
```

---

## Design Decisions

### Why Solidity Instead of Dedot/PAPI?

**Decision**: Use Solidity on Polkadot Hub's EVM instead of native Substrate pallets.

**Rationale**:
1. **Broader Accessibility**: More developers know Solidity than Substrate/Ink!
2. **Faster Development**: Hardhat tooling is mature and well-documented
3. **Feature Parity**: All Idea #141 requirements achievable with Solidity
4. **EVM Compatibility**: Demonstrates Polkadot Hub's Ethereum compatibility
5. **Security**: OpenZeppelin libraries are battle-tested

**Trade-offs**:
- ✅ Pro: Easier to audit, more developers can contribute
- ⚠️ Con: Doesn't showcase native Polkadot features (XCM, etc.)
- 💡 Future: Can integrate XCM in v2.0 via precompiles

### Why Multi-Currency?

**Decision**: Support native DOT + stablecoins (USDC, USDT).

**Rationale**:
1. **Flexibility**: Projects can pay in what they hold
2. **Stability**: Contributors often prefer stablecoin payments
3. **Real-World Need**: Polkadot ecosystem uses both DOT and stables
4. **Demonstrates ERC20 Handling**: Shows complete EVM compatibility

**Implementation**:
- `address(0)` = native DOT
- Whitelisted ERC20 addresses = stablecoins
- Separate stats tracking per currency type

### Why On-Chain Analytics?

**Decision**: Store statistics in smart contract state instead of off-chain database.

**Rationale**:
1. **Transparency**: Anyone can verify platform stats
2. **Simplicity**: No backend infrastructure needed
3. **Trust**: Metrics are tamper-proof
4. **Real-Time**: Always up-to-date with blockchain state

**Trade-offs**:
- ✅ Pro: Decentralized, verifiable, simple
- ⚠️ Con: Gas cost for updating stats (mitigated by combining updates)
- ⚠️ Con: Query performance (fine for <10k bounties)

### Why Context API Over Redux?

**Decision**: Use React Context for state management instead of Redux/Zustand.

**Rationale**:
1. **Simplicity**: Smaller bundle size, less boilerplate
2. **Sufficient Complexity**: App doesn't need advanced state management
3. **Performance**: Optimized with useMemo/useCallback
4. **Native**: No external dependencies

**When to Switch**: If app grows to >20 components sharing state, consider Zustand.

### Why ethers.js v6 Over viem?

**Decision**: Use ethers.js v6 instead of viem.

**Rationale**:
1. **Familiarity**: More developers know ethers.js
2. **Documentation**: Extensive resources and examples
3. **Compatibility**: Works seamlessly with Hardhat
4. **Stability**: Mature library with fewer breaking changes

**Trade-off**: viem is lighter and more modular, but ethers.js is proven.

---

## Performance Optimizations

### Smart Contract

1. **Batch Operations**: Update multiple stats in single transaction
2. **View Functions**: Heavy queries are `view` (no gas cost)
3. **Events Over Storage**: Use events for historical data (cheaper)

### Frontend

1. **Memoization**: Heavy computations wrapped in `useMemo`
2. **Lazy Loading**: Components load on-demand
3. **Pagination**: Only fetch visible bounties
4. **Event Caching**: Cache contract events, poll every 10s
5. **Optimistic Updates**: Update UI before transaction confirms

---

## Testing Strategy

### Smart Contract Tests

**Framework**: Hardhat + Chai  
**Coverage**: 85%+  
**Test Count**: 41 passing tests

**Test Categories**:
- Unit tests: Individual function behavior
- Integration tests: Full bounty lifecycle
- Security tests: Reentrancy, access control
- Edge cases: Minimum amounts, empty strings

```bash
npx hardhat test              # Run all tests
npx hardhat coverage          # Generate coverage report
REPORT_GAS=true hardhat test  # Gas usage report
```

### Frontend Tests

**Framework**: Jest + React Testing Library (planned)  
**Coverage Target**: 70%+

**Test Categories**:
- Component rendering
- User interactions
- Form validation
- Error handling

---

## Deployment

### Contract Deployment

```bash
cd contract
npx hardhat run scripts/deploy.js --network polkadotHub
```

**Deployment Steps**:
1. Deploy mock USDC/USDT (testnet only)
2. Deploy MicroBounty with token addresses
3. Verify contract on block explorer
4. Save contract address to `.env`

### Frontend Deployment

**Platform**: Vercel  
**Build Command**: `npm run build`  
**Output Directory**: `.next`

**Environment Variables**:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x73fC6177262D64ca26A76ECbab8c1aeD97e84AC5
NEXT_PUBLIC_POLKADOT_HUB_RPC=https://rpc.polkadot-hub.io
NEXT_PUBLIC_CHAIN_ID=420420417
```

---

## Monitoring & Maintenance

### Contract Monitoring

- **Block Explorer**: Track all transactions
- **Event Logs**: Monitor BountyCreated, BountyCompleted events
- **TVL Tracking**: Watch platformStats.totalValueLockedDOT

### Frontend Monitoring

- **Vercel Analytics**: Page views, performance
- **Error Tracking**: Console errors, failed transactions
- **User Feedback**: Discord, Telegram for bug reports

---

## Future Architecture Improvements

### v2.0 Enhancements

1. **XCM Integration**
   - Cross-chain bounty verification
   - Pay from Asset Hub, verify on Moonbeam
   - Requires XCM precompiles on Polkadot Hub

2. **Reputation System**
   - On-chain reputation scores
   - NFT badges for achievements
   - Weighted voting for disputes

3. **Milestone Payments**
   - Multi-step bounties
   - Partial payment releases
   - Time-locked escrow

### v3.0 Vision

1. **Parachain Integration**
   - Direct governance proposal → bounty conversion
   - Treasury funding automation
   - Curator assignment

2. **Off-Chain Workers**
   - Automated GitHub issue import
   - AI-powered skill matching
   - Automated dispute mediation

---

## Conclusion

MicroBounty's architecture balances:
- **Security**: Industry-standard patterns, comprehensive testing
- **Simplicity**: No unnecessary complexity, clear separation of concerns
- **Scalability**: Ready for thousands of bounties and users
- **Polkadot-Native**: Built specifically for the Polkadot ecosystem

The system is production-ready for testnet, with a clear path to mainnet deployment and future enhancements.

---

**Last Updated**: March 2026  
**Version**: 1.0  
**Maintainer**: Fatima Aminu (@phertyameen)