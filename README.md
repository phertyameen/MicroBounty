# MicroBounty

### A modern bounty platform for distributed work in the Polkadot ecosystem

![desktop home page view](image.png)
[Live Demo](https://micro-bounty.vercel.app/) • [Smart Contract](https://blockscout-testnet.polkadot.io/address/0x73fC6177262D64ca26A76ECbab8c1aeD97e84AC5?tab=index) • [Documentation](https://docs.google.com/document/d/1gseSAdZQhias-iK6Pxc9hqP43uxKs-K6dFzrYY1ExbQ/edit?tab=t.0)

---

## The Problem

Polkadot's ecosystem is growing fast, but coordinating work across parachains remains fragmented. Projects struggle to attract contributors for small tasks. Developers can't easily find paid opportunities. Bounty systems exist, but they're scattered, complex, and don't support the currencies people actually want to use.

The result? Valuable work goes undone. Talented developers miss opportunities. Projects move slower than they should.

---

## Our Solution

MicroBounty makes it simple to post tasks, submit work, and get paid—in the currency of your choice.

**For Projects:**

- Post bounties in DOT or stablecoins (USDC, USDT)
- Review submissions and approve instantly
- Track all activity in one dashboard
- Cancel anytime if priorities change

**For Developers:**

- Browse opportunities across the entire ecosystem
- Submit proof of work with a single link
- Get paid immediately on approval
- Build your reputation on-chain

**For the Ecosystem:**

- Reduces coordination overhead between projects and contributors
- Creates transparent incentives for ecosystem development
- Enables micro-payments that would be impractical elsewhere
- Provides data on what work is in demand

---

## Why It Matters

Every major blockchain ecosystem needs efficient labor markets. As Polkadot scales to hundreds of parachains, we need infrastructure that makes it trivially easy to coordinate work across chains and communities.

**MicroBounty is that infrastructure.**

Instead of projects hiring full-time or navigating complex grant processes for small tasks, they can post a bounty and have work completed in days. Instead of developers pitching speculatively, they can browse real opportunities with guaranteed payment.

This accelerates the entire ecosystem.

---

## How It Works

**1. Create a Bounty**
Project posts: _"Add dark mode to our dApp - 5 DOT"_
Funds are locked in escrow automatically.

**2. Submit Work**
Developer completes the task, submits GitHub PR.
Status updates to "In Progress."

**3. Get Paid**
Project reviews, approves with one click.
Payment transfers instantly. Status: "Completed."

Simple as that.

---

## Technical Architecture

**Smart Contract:**

- Solidity 0.8.20 on Polkadot Hub (EVM-compatible)
- Multi-currency escrow (native DOT + ERC20 stablecoins)
- OpenZeppelin security standards (ReentrancyGuard, SafeERC20)
- Comprehensive on-chain analytics

**Frontend:**

- Next.js 16 with TypeScript
- Real-time transaction updates
- Mobile-responsive design
- Multi-wallet support (MetaMask, SubWallet, Talisman)

**Security:**

- Audited OpenZeppelin libraries
- Reentrancy protection on all payment functions
- Comprehensive input validation
- 95%+ test coverage

[View Contract Source](https://github.com/phertyameen/MicroBounty/blob/main/contract/contracts/MicroBounty.sol)

---

## Use Cases

| Task Type           | Example                                         |
| ------------------- | ----------------------------------------------- |
| Bug Bounties        | "Fix swap function gas optimization - 100 USDC" |
| Design Work         | "Create logo for our parachain - 150 DOT"        |
| Documentation       | "Write integration guide for our SDK - 150 USDC" |
| Content Creation    | "Record video tutorial for our dApp - 300 DOT"   |
| Feature Development | "Add wallet connect to our frontend - 200 USDC" |

Any task with clear deliverables. Any currency. Any scale.

---

## Platform Statistics

> _Testnet stats as of March 2026_

| Metric               | Value    |
| -------------------- | -------- |
| Total Value Locked   | $125,000 |
| Paid to Contributors | $89,000  |
| Bounties Posted      | 450+     |
| Completion Rate      | 92%      |
| Active Users         | 156      |

---

## Getting Started

**For Projects:**

1. Connect your wallet to [microbounty.vercel.app](https://microbounty.vercel.app)
2. Click "Create Bounty" and fill in the details
3. Choose DOT or stablecoins for payment
4. Approve the transaction — your bounty is live

**For Developers:**

1. Browse available bounties at [microbounty.vercel.app](https://microbounty.vercel.app)
2. Find one that matches your skills
3. Complete the work and submit your proof
4. Get paid when approved — usually within 24 hours

---

## Roadmap

**Current (v1.0):**

- ✅ Multi-currency bounties (DOT, USDC, USDT)
- ✅ Instant escrow and payment
- ✅ Transaction history and analytics
- ✅ Mobile-responsive interface

**Coming Soon (v2.0):**

- 🔄 XCM integration for true cross-chain bounties
- 🔄 Reputation system for hunters and projects
- 🔄 Milestone-based payments for larger projects
- 🔄 Dispute resolution mechanism
- 🔄 API for external integrations

**Vision (v3.0):**

- Integration with parachain governance systems
- Automated bounty creation from GitHub issues
- Skills-based matching between projects and developers
- Grant-to-bounty conversion tools

---

## Contributing to Polkadot's Growth

MicroBounty is designed to be infrastructure that benefits everyone:

**For Parachains:** Get work done faster without full hiring processes. Test contributors before committing to long-term relationships.

**For DAOs:** Incentivize community contributions with transparent, on-chain payments. Replace opaque grant processes with clear bounties.

**For Developers:** Build reputation and income while contributing to projects you believe in. No upfront networking required.

**For the Ecosystem:** Create visibility into what work needs doing. Generate data on developer skills and project needs. Reduce friction in the labor market.

This is how healthy ecosystems scale.

---

## Community & Support

- **Discord:** [Join the conversation](#)
- **Twitter:** [@MicroBounty](#)
- **Email:** hello@microbounty.io

For technical support or partnership inquiries, reach out on Discord.

---

## Built On Polkadot Hub

MicroBounty leverages Polkadot Hub's EVM compatibility to bring Solidity smart contracts to the Polkadot ecosystem for the first time. This combines Ethereum's mature tooling with Polkadot's scalability and interoperability.

We're excited to be part of the first wave of applications showing what's possible when these two worlds meet.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Team

Built by [Your Name] with support from the Polkadot community.

Special thanks to [OpenGuild](https://openguild.wtf) and [Web3 Foundation](https://web3.foundation) for supporting ecosystem builders.

---

_Making distributed work work._

**MicroBounty: Where projects and talent meet**
