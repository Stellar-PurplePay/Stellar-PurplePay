# 💜 Stellar PurplePay

> **Non-custodial escrow, milestone-based payments, and decentralized freelance marketplace infrastructure powered by Soroban smart contracts on the Stellar network.**
>
> **Post. Work. Get Paid. Trustless commerce with zero platform middlemen.**

---

[![CI](https://github.com/Stellar-PurplePay/Stellar-PurplePay/actions/workflows/ci.yml/badge.svg)](https://github.com/Stellar-PurplePay/Stellar-PurplePay/actions/workflows/ci.yml)
[![Vercel Deployment](https://img.shields.io/badge/Deployment-stellarpurplepay.vercel.app-9333ea?logo=vercel)](https://stellarpurplepay.vercel.app)
[![Stellar Network](https://img.shields.io/badge/Stellar-Testnet-08B5E5.svg?logo=stellar)](https://stellar.org)
[![Soroban Smart Contract](https://img.shields.io/badge/Soroban-CDFNNWMA...XCR-9B59B6.svg)](https://stellar.expert/explorer/testnet/contract/CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](SECURITY.md)

Stellar PurplePay is an open-source decentralized freelance commerce platform that eliminates payment delays, high platform commissions, and payment disputes. Clients post jobs with budgets locked in trustless **Soroban smart contract escrows**, freelancers apply with cryptographically sealed proposals, and payments are automatically released on milestone approval.

---

## 🌐 Live Deployments & On-Chain Verification

| Component | Target / Environment | Live URL / Explorer Link |
| :--- | :--- | :--- |
| **Production Frontend** | Vercel Edge Network | [stellarpurplepay.vercel.app](https://stellarpurplepay.vercel.app) |
| **Soroban Smart Contract** | Stellar Testnet | [`CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR`](https://stellar.expert/explorer/testnet/contract/CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR) |
| **Stellar Lab Contract** | Stellar Testnet | [View in Stellar Lab](https://lab.stellar.org/r/testnet/contract/CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR) |
| **Deploy Transaction** | Stellar Testnet | [`ed31467a83467539cf...`](https://stellar.expert/explorer/testnet/tx/ed31467a83467539cfd38c1e3ebbbc959cbd02501d7b31a39dc47ec0a17bc1b2) |
| **Admin / Treasury Key** | Stellar Testnet | `GA54U3SNFU3UQZDYNH4WSIZDDG7NQW354QUXSXLTIHCM4RZ7K3VXFKIR` |
| **Contract Version** | SemVer On-Chain | `0.1.0` |
| **Horizon RPC** | Stellar Testnet | `https://horizon-testnet.stellar.org` |
| **Soroban RPC** | Stellar Testnet | `https://soroban-testnet.stellar.org` |

---

## 🏗️ Architecture & Escrow Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client
    actor Freelancer
    participant Soroban as Soroban Escrow Contract
    participant Backend as PurplePay API
    participant Frontend as PurplePay Next.js App

    Client->>Frontend: Connect Freighter Wallet
    Client->>Frontend: Post Job (e.g. 500 XLM / USDC)
    Frontend->>Soroban: create_escrow(job_id, budget, milestones)
    Note over Soroban: Funds locked in non-custodial contract
    Soroban-->>Backend: EscrowCreated event emitted
    Backend->>Frontend: Job indexed in marketplace listings

    Freelancer->>Frontend: Submit Sealed Bid Commitment (hash of amount + salt)
    Frontend->>Soroban: submit_bid_commitment(job_id, commitment)
    Client->>Soroban: close_bidding(job_id)
    Freelancer->>Soroban: reveal_bid(job_id, amount, salt)
    Client->>Soroban: select_winner(job_id, freelancer_address)
    Note over Soroban: Status: InProgress

    Freelancer->>Frontend: Submit Milestone Work & IPFS Deliverable Proof
    Frontend->>Soroban: submit_deliverable_hash(job_id, ipfs_cid)
    Client->>Frontend: Review deliverable & approve
    Client->>Soroban: release_milestone(job_id, milestone_id)
    Soroban->>Freelancer: Transfer milestone payout (instant settlement)
    Note over Soroban: If dispute occurs, DAO Arbitrators vote on-chain
```

---

## ✨ Key Features & Capabilities

### 🔒 Trustless Soroban Escrow
- **Non-Custodial Security**: PurplePay never holds user private keys or deposits. Funds remain securely custody-locked inside the Soroban contract on Stellar until explicit release or arbitration resolution.
- **Multi-Currency Settlement**: Support for native **XLM** and fiat-pegged **USDC** (SEP-41 compliant token handling).
- **Pro-Rata Milestone Payouts**: Divide contracts into distinct milestones with percentage-based payouts. Approving Milestone 1 releases its exact allocated portion while keeping remaining milestones safely locked.

### 💼 Freelance Marketplace Engine
- **Sealed-Bid Commitments**: Prevent front-running and bid sniping. Freelancers submit hashed bid commitments during the bidding window and reveal bids only after the client closes the stage.
- **Verified Deliverable Hashing**: Freelancers anchor IPFS CIDs and cryptographic SHA-256 hashes of deliverables directly onto the ledger before requesting fund releases.
- **Job Completion NFTs**: On escrow completion, the contract mints non-transferable proof-of-work certificates recognizing freelancer skill and client endorsement.

### 🛡️ Decentralized Arbitration & Governance
- **DAO Arbitrator Registry**: Community-governed pool of vetted arbitrators selected by stake and performance reputation.
- **Dispute Bonding**: Requiring dispute bonds prevents frivolous claims and incentivizes honest deliverables and prompt approvals.
- **Deterministic Timeout Fallbacks**: If a counterparty becomes unresponsive after a configurable ledger timeout, the contract enables permissionless pro-rata refund or release.

---

## 🗂 Project Repository Structure

```
Stellar-PurplePay/
├── frontend/                  # Next.js 15 + React 18 + Tailwind CSS Web Application
│   ├── components/            # Reusable UI widgets, modals, charts, and wallet connectors
│   ├── contexts/              # Price, theme, and authentication providers
│   ├── hooks/                 # Custom React hooks (SWR queries, shortcuts, audio, timers)
│   ├── lib/                   # API client layer, Stellar SDK helpers, and wallet bridge
│   ├── pages/                 # Next.js route pages (Marketplace, Dashboard, DAO, Jobs)
│   └── public/                # Static assets, PWA manifest, and internationalization locales
├── backend/                   # Node.js + Express + PostgreSQL REST Service
│   ├── src/                   # Controllers, middleware, database models, and service workers
│   ├── migrations/            # Versioned SQL database migrations (V1–V49)
│   └── tests/                 # Unit, integration, and security regression test suites
├── contracts/                 # Soroban Smart Contracts (Rust / WASM)
│   ├── marketpay-contract/    # Primary non-custodial escrow & milestone settlement contract
│   ├── arbitrator-registry/   # DAO arbitrator pool, voting, and dispute governance contract
│   ├── marketpay/             # Sep-41 token interactions & auction extensions
│   └── certora/               # Formal verification invariant specifications
├── infra/                     # Infrastructure configuration (Nginx, Cloudflare, Docker)
├── monitoring/                # Prometheus metrics collection and Grafana observability
├── k6/                        # High-load performance benchmarks and stress tests
├── docs/                      # Technical specifications, ADRs, and API documentation
└── .github/                   # GitHub Actions CI/CD workflows and issue templates
```

---

## ⚡ Quick Start & Local Setup

### System Prerequisites

| Tool | Minimum Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.x` | Frontend and Backend runtime |
| **npm** | `>= 10.x` | Package management |
| **Rust & Cargo** | `>= 1.74` | Soroban contract development |
| **Stellar CLI** | `>= 28.x` | Soroban smart contract building & deployment |
| **PostgreSQL** | `>= 15.x` | Backend relational database |
| **Freighter Wallet** | Latest | Browser extension for Stellar authentication |

---

### Step 1: Clone & Configure

```bash
git clone https://github.com/Stellar-PurplePay/Stellar-PurplePay.git
cd Stellar-PurplePay
```

---

### Step 2: Backend Setup

```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
# Backend API listening on http://localhost:4000
```

---

### Step 3: Frontend Setup

```bash
cd ../frontend
npm install

# Copy environment variables
cp .env.example .env.local

# Start Next.js development server
npm run dev
# Frontend interface available at http://localhost:3000
```

---

### Step 4: Build Smart Contracts (Optional for Contract Devs)

```bash
cd ../contracts/marketpay-contract
cargo check --target wasm32v1-none
cargo build --target wasm32v1-none --release

# Run unit tests
cargo test
```

---

## ⚙️ Environment Variables Reference

See [docs/environment-variables.md](docs/environment-variables.md) for the complete reference matrix.

### Frontend (`frontend/.env.local` or `.env.production`)
```env
NEXT_PUBLIC_API_URL=https://stellar-purplepay-backend.vercel.app
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR
NEXT_PUBLIC_USE_CONTRACT_MOCK=false
```

### Backend (`backend/.env`)
```env
PORT=4000
DATABASE_URL=postgresql://purplepay:purplepay_dev@localhost:5432/purplepay
JWT_SECRET=your-secure-jwt-random-secret
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
CONTRACT_ID=CDFNNWMAV337YGIBMZTDZGTBVRWJI4BAJNBMJMSMVAMVUHIV3DXWCXCR
ALLOWED_ORIGINS=http://localhost:3000,https://frontend-zeta-sable-22.vercel.app
```

---

## 🛠️ Common Troubleshooting & Error Resolution

| Error / Symptom | Root Cause | Immediate Fix |
| :--- | :--- | :--- |
| **"Freighter wallet not detected"** | Extension missing or site permissions denied | Install [Freighter](https://www.freighter.app), switch network to **Testnet** in extension settings, and ensure the site is allowed in the extension's connection prompt. |
| **"TxSorobanInvalid / Simulation Failed"** | Unoptimized WASM binary or insufficient resource fee | Run `stellar contract optimize` on the WASM artifact before deployment. Increase `--inclusion-fee` if network congestion is high. |
| **"Account not found on Testnet"** | Public key has not been funded with test lumens | Use the [Stellar Friendbot](https://friendbot.stellar.org) or run `stellar keys fund <alias> --network testnet` to credit 10,000 test XLM. |
| **"Database connection refused"** | PostgreSQL container or daemon not active | Run `docker-compose up -d postgres` or start your local service with `sudo systemctl start postgresql` and verify `DATABASE_URL`. |
| **"CORS origin rejected"** | Backend `ALLOWED_ORIGINS` does not match client host | Add your local or production frontend host to `ALLOWED_ORIGINS` in `backend/.env`. |

---

## 🧪 Comprehensive Quality Assurance & Testing

```bash
# Frontend Unit, Component, and Snapshot Tests
cd frontend
npm test

# Backend Unit, Integration, and Coverage Tests
cd ../backend
npm test
npm run test:integration

# End-to-End User Flow Tests (Playwright)
cd ../frontend
npm run test:e2e

# Smart Contract Rust Unit Tests & Simulation
cd ../contracts/marketpay-contract
cargo test
```

---

## 📜 Community, Standards & Compliance

- **[Code of Conduct](CODE_OF_CONDUCT.md)** — Contributor Covenant 2.1 standards for an open, respectful, and inclusive community.
- **[Contributing Guidelines](CONTRIBUTING.md)** — Architectural conventions, branch naming standards, commit hygiene, and pull request checklist.
- **[Security Policy](SECURITY.md)** — Responsible disclosure policy, private advisory channels, and response SLAs.
- **[Product Roadmap](ROADMAP.md)** — Feature milestones, governance schedule, and protocol upgrades.
- **[License](LICENSE)** — Licensed under the permissive **MIT License**.

---

## 👥 Contributors & Stewardship

Maintained with 💜 by the **Stellar PurplePay Community**. Contributions, pull requests, and audit reports are welcome!
