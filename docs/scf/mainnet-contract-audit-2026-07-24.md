# Mainnet Contract Audit Gate - 2026-07-24 19:02 BST

Scope: focused pre-mainnet review of `contracts/deal_escrow/src/lib.rs` for the final-tranche release candidate currently deployed on Stellar Testnet as `CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP`.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-24 19:02 BST | Mainnet contract audit gate | Reviewed the DealEscrow release-candidate auth boundaries, state transitions, locked-balance accounting, dispute/refund outcomes, and mainnet deployment risks. No contract code change required before the next gate; mainnet deployment remains blocked on admin wallet and production asset decisions. | `cargo test` passed with 16 tests; `stellar contract build` passed; optimized `deal_escrow.wasm` hash `0095d331033b2f380b9cf1dda46dff098aa722774a0041da1cb18159e9f20382`. |

## Artifact Under Review

```text
WASM:      target/wasm32v1-none/release/deal_escrow.wasm
Size:      15,721 bytes
SHA-256:   0095d331033b2f380b9cf1dda46dff098aa722774a0041da1cb18159e9f20382
Exports:   initialize, create_deal, deposit, fund_deal, release_milestone,
           dispute, resolve_dispute, refund, get_deal, get_deal_count,
           get_reputation
```

This hash matches the current Testnet release-candidate deployment recorded in `docs/SMART_CONTRACT.md`.

## Audit Summary

Status: **release candidate acceptable for a tiny mainnet pilot after ops decisions are made**.

No high-severity contract bug was found in this pass. The contract keeps a small surface area and uses Stellar Asset Contract transfers directly. Auth boundaries, milestone state checks, and `funded_amount` accounting align with the intended fund-once, release-per-milestone product flow.

Mainnet is still blocked by operational choices, not by a newly found code defect:

- production admin wallet must be selected before initialization
- protocol wallet must be selected before initialization
- production settlement assets must be confirmed, especially Stellar USDC SAC/issuer/trustline flow
- deploy and initialize must happen as one controlled run because admin cannot rotate later

## Function Review

| Function | Review Result | Notes |
|---|---|---|
| `initialize` | Pass with deployment caution | Can only be called once, but there is no auth on first call. Mainnet deploy run must initialize immediately after deploy with the intended admin/protocol wallets. |
| `create_deal` | Pass | Requires client auth, validates positive milestones, split bps, non-empty milestone list, and max 20 milestones. Token allowlist is intentionally not enforced on-chain; frontend/API policy must constrain to XLM/USDC. |
| `deposit` | Pass | Requires client auth and only funds `Pending` milestone. Retained for staged funding/backwards compatibility. |
| `fund_deal` | Pass | Requires client auth, transfers the sum of all pending milestones once, marks each pending milestone funded, emits existing `funded` event shape per milestone. |
| `release_milestone` | Pass | Requires client auth, only releases `Funded` milestones on an active deal, performs provider/connector/protocol transfers atomically, decrements `funded_amount`. |
| `dispute` | Pass | Requires caller auth and caller must be client or provider. Only funded milestones can be disputed. |
| `resolve_dispute` | Pass with product note | Requires admin auth. `refund_bps=0` sends the disputed milestone amount fully to provider, `10000` refunds client, partial values split client/provider. It does not take platform/connector fees on provider-win dispute resolution; this matches current admin-resolution semantics but should be accepted as policy before mainnet. |
| `refund` | Pass with operational caution | Requires admin auth. Refunds every `Funded` or `Disputed` milestone in the deal and leaves released milestones untouched. Use only for emergency whole-deal unwind of remaining locked funds. |

## State And Accounting Checks

- `funded_amount` increases only on `deposit` and `fund_deal`.
- `funded_amount` decreases on `release_milestone`, `resolve_dispute`, and `refund`.
- Released funds cannot be refunded by `refund`.
- Pending funds are not refunded because they were never transferred into escrow.
- Provider-win dispute resolution marks milestone `Released`; if all milestones are released, deal becomes `Completed`.
- Full client-refund dispute resolution marks milestone `Refunded`; if all funded work is refunded and no released work exists, deal becomes `Cancelled`.
- Partial dispute settlement marks milestone `Resolved`; mixed released/refunded outcomes become `Resolved`.
- Reputation increments only when all milestones become `Released`.

## Mainnet Deployment Blockers

Before deploying mainnet:

1. Choose production admin wallet.
   - Preferred: multisig or policy-controlled signer.
   - Minimum pilot: dedicated Stellar ops wallet, not a reused testnet/deployer key.
2. Choose production protocol wallet.
3. Confirm production settlement asset policy:
   - native XLM SAC
   - approved Stellar USDC SAC/issuer/decimals/trustline instructions
4. Prepare exact environment values:
   ```env
   STELLAR_NETWORK=mainnet
   VITE_STELLAR_NETWORK=mainnet
   STELLAR_RPC_URL=<mainnet RPC>
   VITE_STELLAR_RPC_URL=<mainnet RPC>
   VITE_STELLAR_HORIZON_URL=https://horizon.stellar.org
   VITE_STELLAR_EXPLORER_URL=https://stellar.expert/explorer/public
   VITE_DEAL_ESCROW_CONTRACT=<mainnet contract>
   VITE_SETTLEMENT_TOKEN_SYMBOL=USDC
   VITE_SETTLEMENT_TOKEN_NAME=Stellar USDC
   VITE_SETTLEMENT_ASSET_POLICY=approved-mainnet
   ```
5. Deploy optimized WASM hash `0095d331033b2f380b9cf1dda46dff098aa722774a0041da1cb18159e9f20382`.
6. Initialize immediately with production admin/protocol wallets.
7. Capture deploy and initialize explorer links.
8. Run tiny mainnet smoke:
   - create deal
   - fund deal once
   - release one milestone
   - optionally file and resolve a tiny dispute only if the admin wallet and evidence plan are ready

## Residual Risks

- No admin rotation or pause mechanism exists in this contract version.
- No on-chain settlement-token allowlist exists; off-chain product/API config must prevent arbitrary token use in production flows.
- No TTL/rent maintenance function exists; operations should monitor contract/deal storage durability after mainnet launch.
- The contract has unit tests but no independent external audit, fuzzing, or formal verification.
- Server-side admin execution is available only as an explicitly enabled ops convenience. Mainnet should prefer multisig/policy-controlled signing over a long-lived server hot key.

## Validation Performed

```bash
cargo test
stellar contract build
shasum -a 256 target/wasm32v1-none/release/deal_escrow.wasm
```

Results:

```text
cargo test: 16 passed, 0 failed
stellar contract build: passed
deal_escrow.wasm SHA-256: 0095d331033b2f380b9cf1dda46dff098aa722774a0041da1cb18159e9f20382
```
