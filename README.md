# 💜 Stellar PurplePay

> **Non-custodial escrow, milestone payments, and freelance marketplace infrastructure powered by Soroban smart contracts on Stellar.**
>
> **Post. Work. Get Paid.**

[![CI](https://github.com/Stellar-PurplePay/Stellar-PurplePay/actions/workflows/ci.yml/badge.svg)](https://github.com/Stellar-PurplePay/Stellar-PurplePay/actions/workflows/ci.yml)
[![Stellar Network](https://img.shields.io/badge/Stellar-Testnet-08B5E5.svg)](https://stellar.org)
[![Soroban Smart Contract](https://img.shields.io/badge/Soroban-CDFNNWMA...XCR-9B59B6.svg)](https://stellar.expert/explorer/testnet/contract/CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Stellar PurplePay is an open-source decentralised freelance marketplace where clients post jobs, freelancers apply, and payments are secured in **Soroban smart contract escrow** — released automatically when work is approved. Multi-currency support (XLM + USDC), milestone-based releases, on-chain dispute arbitration, and DAO-governed arbitrator registries make PurplePay a complete commerce protocol for freelance work.

---

## 🚀 Verified On-Chain Contract

| Resource | Details |
| :--- | :--- |
| **Soroban Contract ID** | [`CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR`](https://stellar.expert/explorer/testnet/contract/CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR) |
| **Stellar Expert Explorer** | [View Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR) |
| **Stellar Lab Explorer** | [View Contract in Stellar Lab](https://lab.stellar.org/r/testnet/contract/CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR) |
| **Network** | `Stellar Testnet` (Passphrase: `Test SDF Network ; September 2015`) |
| **Horizon RPC** | `https://horizon-testnet.stellar.org` |
| **Soroban RPC** | `https://soroban-testnet.stellar.org` |

---

## ✨ Features

### Core Marketplace

- 🔗 **Wallet Connect** — Freighter browser wallet integration for seamless authentication
- 📋 **Post & Browse Jobs** — Clients post jobs with XLM/USDC budgets locked in escrow
- 🙋 **Apply & Bid** — Freelancers submit proposals with skill-matched applications
- 🔒 **Escrow Payments** — Funds held in Soroban contract until work is approved
- ✅ **Release & Complete** — Client approves → funds released to freelancer instantly
- 📜 **Job History** — Track all jobs, earnings, and transaction history on-chain

### Multi-Currency & Milestones

- 💵 **USDC Support** — Pay with USDC alongside XLM for stable-value contracts
- 🎯 **Milestone-Based Escrow** — Lock funds per milestone, release on individual approval
- 💬 **In-App Messaging** — Real-time communication between clients and freelancers
- ⭐ **Reputation System** — Ratings, reviews, and trust signals across profiles

### Dispute Resolution & Governance

- 🛡️ **On-Chain Arbitration** — Dispute resolution with evidence anchoring on Stellar
- 🏛️ **DAO-Governed Arbitrator Registry** — Community-voted dispute arbiters
- 🗳️ **Platform Governance** — Decentralised decision-making via Soroban contracts
- 🔍 **Search & Discovery** — Full-text search, filtering, and AI-assisted matching

---

## 🗂 Project Structure

```
Stellar-PurplePay/
├── frontend/              # Next.js + React + Tailwind CSS UI
├── backend/               # Node.js + Express REST API
├── contracts/
│   ├── marketpay-contract/    # Soroban escrow smart contract (Rust)
│   ├── arbitrator-registry/   # DAO arbitrator governance contract
│   ├── marketpay/             # Marketplace token contract
│   └── certora/               # Formal verification specifications
├── packages/
│   ├── backend/           # Shared backend utilities
│   └── client/            # TypeScript/JavaScript client SDK
├── infra/                 # Cloudflare, Grafana, Nginx configuration
├── monitoring/            # Prometheus, Grafana dashboards, Filebeat
├── k6/                    # Load testing & performance benchmarks
├── deploy/                # Helm charts & deployment scripts
├── docs/                  # Architecture, API, and operational docs
├── tests/                 # Cross-cutting integration tests
├── scripts/               # Development & utility scripts
└── .github/               # CI/CD workflows & issue templates
```

---

## 🚀 Quick Start

### Prerequisites

| Tool             | Version                |
| ---------------- | ---------------------- |
| Node.js          | ≥ 18.x                 |
| npm              | Latest                 |
| Rust + Cargo     | ≥ 1.74 (for contracts) |
| Freighter Wallet | Browser extension      |

### 1. Clone & Setup

```bash
git clone https://github.com/Stellar-PurplePay/Stellar-PurplePay.git
cd Stellar-PurplePay
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

### 2. Start Backend

```bash
cd backend
npm run dev
# → http://localhost:4000
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

### 4. Database Migrations

```bash
cd backend
npm run migrate            # Apply all pending migrations (V1–V49)
npm run migrate:rollback   # Roll back the most recent migration
```

---

## 🔑 Environment Variables

See [docs/environment-variables.md](docs/environment-variables.md) for the full list of backend and frontend variables, validation rules, and examples.

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=CBFJNX67NYYRZPLH4YYT77ZUULRJ5NI2LPEYRRLFHBTEACZOZUUYLOGG
NEXT_PUBLIC_USE_CONTRACT_MOCK=false
```

### Backend (`backend/.env`)

```env
PORT=4000
DATABASE_URL=postgresql://purplepay:purplepay_dev@localhost:5432/purplepay
JWT_SECRET=replace-with-a-long-random-secret
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
CONTRACT_ID=CBFJNX67NYYRZPLH4YYT77ZUULRJ5NI2LPEYRRLFHBTEACZOZUUYLOGG
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🧪 Offline Development with Contract Mock

For frontend development without a deployed Soroban contract:

1. **Enable mock mode** in `frontend/.env.local`:

   ```env
   NEXT_PUBLIC_USE_CONTRACT_MOCK=true
   ```

2. **Start the frontend**:

   ```bash
   cd frontend && npm run dev
   ```

3. **What works offline**:
   - ✅ Job creation with escrow locking
   - ✅ Start work, release escrow, refund escrow
   - ✅ Query escrow status and records
   - ✅ All contract calls logged to browser console
   - ✅ Realistic delays and error simulation
   - ✅ No Freighter signing required

4. **Switch back to real contract**:
   Set `NEXT_PUBLIC_USE_CONTRACT_MOCK=false` and provide a valid `NEXT_PUBLIC_CONTRACT_ID`.

---

## 🧪 Testing

| Suite                   | Command                                        | Notes                                            |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Frontend unit snapshots | `cd frontend && npm test`                      | Jest + React Testing Library                     |
| Update snapshots        | `cd frontend && npm run test:update-snapshots` | Regenerate when UI changes are intentional       |
| Backend unit + coverage | `cd backend && npm test`                       | HTML report in `backend/coverage/`               |
| Backend mutation tests  | `cd backend && npm run stryker`                | Fails below the required 80% mutation score      |
| E2E (Playwright)        | `cd frontend && npm run test:e2e`              | Includes full client/freelancer marketplace flow |
| Formal verification     | `certoraSorobanProver contracts/certora/config.conf` | Certora Prover for escrow invariants       |

Deploy or upgrade the Soroban escrow contract using [docs/contract-deployment.md](docs/contract-deployment.md).

---

## 🧪 Get Testnet XLM

1. Install [Freighter Wallet](https://freighter.app)
2. Switch to **Testnet** in Freighter settings
3. Visit [Stellar Friendbot](https://friendbot.stellar.org) with your public key
4. Receive 10,000 test XLM instantly

---

## 📚 Documentation

| Document | Description |
| :--- | :--- |
| **[Architecture Decision Records](docs/adr/README.md)** | Design decisions and rationale |
| **[API Documentation](docs/api.md)** | Complete REST API reference |
| **[API Client SDKs](docs/api-client-sdk.md)** | TypeScript, Python, and Go client libraries |
| **[Contract Deployment](docs/contract-deployment.md)** | Deploy and upgrade Soroban smart contracts |
| **[Formal Verification](docs/formal-verification.md)** | Certora Prover invariant specifications |
| **[Dispute Resolution](docs/dispute-resolution.md)** | Arbitration workflows and evidence anchoring |
| **[Production Deployment](docs/deployment-production.md)** | Deploy to AWS, GCP, or DigitalOcean |
| **[Prometheus Metrics](backend/docs/METRICS.md)** | Metrics reference and observability setup |
| **[Troubleshooting Guide](docs/troubleshooting.md)** | Common issues and solutions |

---

## 🤝 Contributing & Community

- **[Contributing Guide](CONTRIBUTING.md)** — Getting started, branch conventions, and testing
- **[Code of Conduct](CODE_OF_CONDUCT.md)** — Community standards and pledge
- **[Security Policy](SECURITY.md)** — Vulnerability reporting and scope

## 🗺 Roadmap

See [ROADMAP.md](ROADMAP.md) for shipped milestones and planned features.

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
