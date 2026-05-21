# MagicBlock VRF & ER Integration Example

This project demonstrates the integration of MagicBlock Verifiable Randomness Function (VRF) into a Solana Anchor program, both on the base layer (Solana Mainnet/Devnet) and within an Ephemeral Rollup (ER).

## Architecture

The project consists of an Anchor program `er-state-account` that manages a user state PDA. The state includes fields for tracking randomness requests and results.

### User State PDA
- `user`: Pubkey of the user.
- `data`: General data field.
- `score`: Cumulative score updated by randomness.
- `random_number`: The last random number received.
- `status`: Current status (0: Idle, 1: Requesting, 2: Fulfilled).
- `reward`: Reward calculated based on the random number.

## VRF Flow

### Task 1: VRF Outside ER (Base Layer)
1. **Request**: The user calls `request_randomness`. This instruction uses the `ephemeral_vrf_sdk` to send a CPI to the MagicBlock VRF program.
2. **Oracle Execution**: The MagicBlock VRF oracle detects the request, generates a verifiable random number, and submits it back to the VRF program.
3. **Callback**: The VRF program calls the `consume_randomness` instruction in our program.
4. **Update**: Our program validates the VRF signer and updates the `UserAccount` with the new randomness.

### Task 2: VRF Inside ER (Ephemeral Rollup)
1. **Delegation**: The user delegates their `UserAccount` PDA to the MagicBlock Ephemeral Rollup.
2. **Request**: Inside the ER, the user calls `request_randomness`.
3. **Low-Latency Fulfillment**: Because the VRF program and oracles are integrated into the ER, the randomness is fulfilled significantly faster (sub-second).
4. **Commit**: The updated state is committed back to the Solana base layer when the user undelegates or during periodic commits.

## Comparison: VRF Outside vs Inside ER

| Feature | Outside ER (Base Layer) | Inside ER (Ephemeral Rollup) |
|---------|-------------------------|------------------------------|
| Latency | Seconds (Solana block time) | Milliseconds (ER sub-second) |
| Cost | Standard Solana fees | Zero/Minimal fees within ER |
| State | Permanent on-chain | Ephemeral until committed |
| Throughput | Limited by Solana TPS | High throughput, low congestion |

## How to Run & Test

### Prerequisites
- Solana CLI
- Anchor CLI (v0.32.0+)
- Node.js & Yarn

### Installation
```bash
yarn install
anchor build
```

### Testing
To run the tests on Devnet:
```bash
anchor test
```

The tests cover:
- Initializing the user account.
- Requesting randomness on the base layer.
- Waiting for and verifying the VRF callback.
- Delegating the account to ER.
- Requesting randomness within the ER.
- Verifying the state update in ER.
- Committing the state back to the base layer.

## Technical Details
- **SDK**: Uses `ephemeral_vrf_sdk` and `ephemeral_rollups_sdk`.
- **VRF Program ID**: `Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz`
- **Oracle Queue**: `Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh`
# solana-magicblock-vrf
