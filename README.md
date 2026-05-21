# MagicBlock VRF & Ephemeral Rollup Integration

[![Build Status](https://img.shields.io/badge/Anchor-1.0.0-blue.svg)](https://www.anchor-lang.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade implementation of **MagicBlock Verifiable Randomness Function (VRF)** integrated into a Solana Anchor program. This repository demonstrates how to execute secure, on-chain randomness both on the Solana base layer and within high-performance **Ephemeral Rollups (ER)**.

---

## 🚀 Overview

This project showcases the seamless transition of state between Solana's L1 and MagicBlock's Ephemeral Rollups, utilizing verifiable randomness to drive state updates (score, rewards, and status).

### Key Features
- **Dual-Layer VRF**: Implementations for both base layer (Devnet/Mainnet) and Ephemeral Rollup execution.
- **State Delegation**: Practical example of delegating PDA state to an ER for low-latency processing.
- **Secure Callbacks**: Hardened VRF callback validation ensuring only verified oracle results update the state.
- **Modern Stack**: Built with Anchor 1.0.0, utilizing the latest `ephemeral-vrf-sdk` and `ephemeral-rollups-sdk`.

---

## 🏗 Architecture

The program manages a `UserAccount` PDA that tracks the lifecycle of randomness requests and cumulative user data.

### State Schema (`UserAccount`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | `Pubkey` | The authority of the account. |
| `score` | `u64` | Cumulative points updated via VRF results. |
| `random_number` | `u64` | The most recent random value received (1-100). |
| `status` | `u8` | `0: Idle`, `1: Requesting`, `2: Fulfilled`. |
| `reward` | `u64` | Rewards calculated based on the last random value. |

---

## ⚡ Execution Flows

### 1. Base Layer (Standard)
Ideal for high-security, high-latency requirements.
- **Request**: Triggered via `request_randomness` CPI to the VRF Program.
- **Fulfillment**: MagicBlock oracles fulfill the request in the next available slots.
- **Callback**: Secure execution of `consume_randomness` to update L1 state.

### 2. Ephemeral Rollup (High Performance)
Ideal for gaming and real-time applications requiring sub-second feedback.
- **Delegation**: The `UserAccount` is delegated to the ER.
- **In-Rollup VRF**: Randomness is requested and fulfilled within the ER execution flow.
- **Commitment**: Final state is committed back to the base layer asynchronously.

---

## 🛠 Getting Started

### Prerequisites
- [Solana Tool_Suite](https://docs.solana.com/tools/install-solana-cli-tools) (v1.18+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v1.0.2+)
- [Node.js](https://nodejs.org/) & [Yarn](https://yarnpkg.com/)

### Installation
```bash
git clone https://github.com/ShrinathNR/magicblock-er-example.git
cd magicblock-er-example
yarn install
```

### Build & Test
1. **Sync Program IDs**:
   ```bash
   anchor keys sync
   ```
2. **Build**:
   ```bash
   anchor build
   ```
3. **Run Integration Tests**:
   Ensure your wallet is funded on Devnet or run against Localnet:
   ```bash
   # Run on Devnet (Requires ~3 SOL for deployment)
   anchor test --provider.cluster devnet
   ```

---

## 🧪 Testing Scenarios

The integration suite in `tests/er-state-account.ts` validates:
1. **L1 Initialization**: Correct PDA derivation and initialization.
2. **L1 VRF Cycle**: Successful request and verified callback fulfillment.
3. **ER Delegation**: Smooth transition of L1 state into the Ephemeral Rollup.
4. **ER VRF Cycle**: Low-latency randomness fulfillment within the rollup.
5. **L1 Commitment**: Verification of state persistence after undelegation.

---

## 🔐 Security & Rationale

- **Signer Validation**: The `consume_randomness` instruction strictly validates the `vrf_program_identity` PDA to prevent unauthorized state updates.
- **Atomic Operations**: State transitions (e.g., setting status to `Requesting`) are atomic to prevent double-spending or replay attacks on randomness.
- **SDK Compliance**: Follows official MagicBlock patterns using `create_request_randomness_ix` and `invoke_signed_vrf`.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Developed for the MagicBlock Ecosystem.**  
*For detailed SDK documentation, visit [docs.magicblock.gg](https://docs.magicblock.gg/).*
