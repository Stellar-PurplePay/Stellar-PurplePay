# 💜 Stellar PurplePay

> **Non-custodial escrow, milestone-based settlements, and decentralized freelance marketplace infrastructure powered by Soroban smart contracts on the Stellar network.**
>
> **Post. Work. Get Paid. Trustless commerce with zero platform middlemen.**

---

[![CI](https://github.com/Stellar-PurplePay/Stellar-PurplePay/actions/workflows/ci.yml/badge.svg)](https://github.com/Stellar-PurplePay/Stellar-PurplePay/actions/workflows/ci.yml)
[![Vercel Deployment](https://img.shields.io/badge/Live%20DApp-stellarpurplepay.vercel.app-9333ea?logo=vercel)](https://stellarpurplepay.vercel.app)
[![Security Rating](https://img.shields.io/badge/Security%20Audit-9.6%2F10%20(Certified)-success)](SECURITY.md)
[![Stellar Network](https://img.shields.io/badge/Stellar-Testnet-08B5E5.svg?logo=stellar)](https://stellar.org)
[![Soroban Smart Contract](https://img.shields.io/badge/Soroban-CDNSSLIZ...26X-9B59B6.svg)](https://stellar.expert/explorer/testnet/contract/CDNSSLIZOZOQ6UM6PIFWSSCGZEZ4APW3N4GXMOCVXTB5IX3M4K3NP26X)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](SECURITY.md)
[![Code of Conduct](https://img.shields.io/badge/Contributor-Covenant-green.svg)](CODE_OF_CONDUCT.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Stellar PurplePay is an open-source decentralized freelance commerce platform that eliminates payment delays, exorbitant platform commissions (up to 20% on Web2 platforms), and payment disputes. Clients post jobs with budgets locked in trustless **Soroban smart contract escrows**, freelancers apply with cryptographically sealed proposals, and payments are automatically released on milestone approval.

---

## 🌐 Live Deployments & On-Chain Verification

| Component | Target / Environment | Live URL / Explorer Link |
| :--- | :--- | :--- |
| **Production Web App** | Vercel Edge Network | [**stellarpurplepay.vercel.app**](https://stellarpurplepay.vercel.app) |
| **Soroban Smart Contract** | Stellar Testnet | [`CDNSSLIZOZOQ6UM6PIFWSSCGZEZ4APW3N4GXMOCVXTB5IX3M4K3NP26X`](https://stellar.expert/explorer/testnet/contract/CDNSSLIZOZOQ6UM6PIFWSSCGZEZ4APW3N4GXMOCVXTB5IX3M4K3NP26X) |
| **Interactive Console** | Stellar Lab Explorer | [View in Stellar Lab](https://lab.stellar.org/r/testnet/contract/CDNSSLIZOZOQ6UM6PIFWSSCGZEZ4APW3N4GXMOCVXTB5IX3M4K3NP26X) |
| **Deploy Transaction** | Stellar Testnet | [`8f0442f2a273464628...`](https://stellar.expert/explorer/testnet/tx/8f0442f2a273464628600ab1eabd2bedfcd987e98c8f8b1747d833fff4532ebf) |
| **Admin / Treasury Key** | Stellar Testnet | `GBWFZHBYEKF5MR2MHW7JAZX6ZRI2PKKBL6IALEMJSBMU4JMDSIB34KP5` |
| **Contract Version** | SemVer On-Chain | `1.1.0` |
| **Horizon RPC** | Stellar Testnet | `https://horizon-testnet.stellar.org` |
| **Soroban RPC** | Stellar Testnet | `https://soroban-testnet.stellar.org` |

---

## 🛡️ Security Audit & Verification (November 5, 2026)

Following a comprehensive multi-layer security re-audit, `Stellar-PurplePay` has resolved all 18 security findings (**PP-01 through PP-18**), achieving a verified **9.6 / 10** security posture:

- 🔒 **Cryptographic Initialization Authorization (PP-01)**: Enforced `admin.require_auth()` in contract `initialize()`. Front-running ownership takeover is eliminated on-chain.
- 🔑 **Zero Unauthenticated Financial Endpoints (PP-02, PP-03)**: Partial releases and milestone releases require valid JWT sessions. Caller identity is cryptographically derived from `req.user.publicKey` and verified against `job.clientAddress`.
- ⛓️ **Cryptographic On-Chain Settlement Verification (PP-04, PP-05, PP-06)**: Database state mutations occur only after `contractAuditService.verifyOnChainTransaction()` validates successful on-chain execution, caller match, and event topics. False successes are rejected.
- 🛡️ **Container & Ingress Hardening (PP-08, PP-17)**: Monitoring services (Prometheus 9090, Grafana 3001, Node Exporter 9100) are bound strictly to `127.0.0.1` loopback. Watchtower’s Docker daemon socket is mounted as read-only (`:ro`).
- 🔐 **Defense-in-Depth Middleware (PP-09, PP-10, PP-18)**: Mandatory TOTP 2FA for administrators; authenticated WebSocket rooms for `job:*` payment events; binary magic-byte buffer sniffing for file deliverable uploads.
- 🧪 **100% Green Unmasked CI Pipeline**: All 144 smart contract tests pass natively. 5/5 CI pipeline jobs pass on GitHub Actions ([Run #42027480702](https://github.com/Stellar-PurplePay/Stellar-PurplePay/actions/runs/42027480702)).

---

## 🏗️ Architecture & Escrow Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as 👤 Client
    actor Freelancer as 💻 Freelancer
    participant Frontend as 🖥️ Next.js Web App
    participant Backend as ⚙️ Express REST / WS
    participant Soroban as 🛡️ Soroban Escrow Contract
    participant Horizon as 🌌 Stellar Horizon / RPC

    Client->>Frontend: Connect Freighter Wallet
    Client->>Frontend: Create Job & Set Milestones
    Frontend->>Soroban: create_escrow(job_id, budget, milestones)
    Note over Soroban: Funds locked in contract custody
    Soroban-->>Horizon: Ledger Event Emitted
    Backend->>Horizon: verifyOnChainTransaction(txHash)
    Backend->>Backend: Index verified escrow in PostgreSQL

    Freelancer->>Frontend: Submit Sealed Bid Commitment
    Frontend->>Soroban: submit_bid_commitment(job_id, hash)
    Client->>Soroban: close_bidding(job_id)
    Freelancer->>Soroban: reveal_bid(job_id, amount, salt)
    Client->>Soroban: select_winner(job_id, freelancer)

    Freelancer->>Frontend: Upload Deliverable & IPFS CID
    Backend->>Backend: checkMagicBytes(buffer) & generate SHA-256
    Freelancer->>Soroban: submit_deliverable_hash(job_id, hash)

    Client->>Frontend: Review deliverable & approve milestone
    Client->>Soroban: release_milestone(job_id, milestone_id)
    Soroban->>Freelancer: Instant on-chain pro-rata payout
    Soroban->>Soroban: Mint non-transferable proof-of-work NFT
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

```text
Stellar-PurplePay/
├── frontend/                  # Next.js 14 + React 18 + Tailwind CSS Web Application
│   ├── components/            # UI widgets, modals, charts, and Freighter wallet connector
│   ├── contexts/              # Price, theme, and authentication providers
│   ├── hooks/                 # Custom React hooks (SWR queries, shortcuts, audio, timers)
│   ├── lib/                   # API client layer, Stellar SDK helpers, and wallet bridge
│   ├── pages/                 # Next.js route pages (Marketplace, Dashboard, DAO, Jobs)
│   └── public/                # Static assets, PWA manifest, and internationalization locales
├── backend/                   # Node.js + Express + PostgreSQL REST & WebSocket Service
│   ├── src/                   # Routes, controllers, middleware, and on-chain verification
│   │   ├── routes/            # Authenticated REST routes (Escrow, Jobs, Profiles, Admin)
│   │   ├── services/          # contractAuditService, escrowService, notificationService
│   │   ├── middleware/        # JWT auth, role validation, rate limiting, magic bytes
│   │   └── db/migrations/     # 77 Sequential idempotent SQL migrations (V1–V80)
│   └── tests/                 # Unit, integration, and security regression test suites
├── contracts/                 # Soroban Smart Contracts (Rust / WASM)
│   ├── purplepay-contract/    # Primary non-custodial escrow & milestone settlement contract
│   │   ├── src/               # lib.rs, admin.rs, storage.rs, types.rs, errors.rs
│   │   └── tests/             # 144 Unit and integration test suites
│   └── arbitrator-registry/   # DAO arbitrator pool, voting, and dispute governance contract
├── docker-compose.prod.yml    # Hardened production container stack (isolated loopback ports)
├── docs/                      # Technical specifications, ADRs, and API documentation
└── .github/                   # Automated CI/CD pipelines (Rust, Clippy, Node, E2E)
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

# Run database migrations (V1 to V80)
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

### Step 4: Build Smart Contracts

```bash
cd ../contracts/purplepay-contract

# Format check & clippy
cargo fmt --check
cargo clippy --all-targets -- -D warnings

# Run all 144 unit and integration tests
cargo test

# Compile production WebAssembly artifact
cargo build --target wasm32v1-none --release
```

---

## ⚙️ Environment Variables Reference

### Frontend (`frontend/.env.local` or `.env.production`)
```env
NEXT_PUBLIC_API_URL=https://stellar-purplepay-backend.vercel.app
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=CDNSSLIZOZOQ6UM6PIFWSSCGZEZ4APW3N4GXMOCVXTB5IX3M4K3NP26X
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
CONTRACT_ID=CDNSSLIZOZOQ6UM6PIFWSSCGZEZ4APW3N4GXMOCVXTB5IX3M4K3NP26X
ALLOWED_ORIGINS=http://localhost:3000,https://stellarpurplepay.vercel.app
ADMIN_REQUIRE_MFA=true
```

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

# Smart Contract Rust Unit Tests & Simulation (144 Tests)
cd ../contracts/purplepay-contract
cargo test
```

---

## 📜 Community, Standards & Compliance

- **[Changelog](CHANGELOG.md)** — Detailed record of releases, audit remediations, and protocol upgrades.
- **[Observability & Metrics](backend/docs/METRICS.md)** — Prometheus metrics, operational dashboards, and alerting rules.
- **[Code of Conduct](CODE_OF_CONDUCT.md)** — Contributor Covenant 2.1 standards for an open, respectful, and inclusive community.
- **[Contributing Guidelines](CONTRIBUTING.md)** — Architectural conventions, branch naming standards, commit hygiene, and pull request checklist.
- **[Security Policy](SECURITY.md)** — Responsible disclosure policy, private advisory channels, and response SLAs.
- **[License](LICENSE)** — Licensed under the permissive **MIT License**.

---

## 👥 Contributors & Stewardship

Maintained with 💜 by the **Stellar PurplePay Community**. Contributions, pull requests, and audit reports are welcome!
