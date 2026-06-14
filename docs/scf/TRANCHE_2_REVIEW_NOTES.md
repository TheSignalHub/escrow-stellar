# SCF #42 Tranche 2 Review Notes

This document is the reviewer-facing evidence map for Tranche 2 testnet delivery. It preserves the submitted deliverable scope and points reviewers to the code, configuration, and transaction evidence used in the demo video.

## Testnet Configuration

| Item | Value |
|---|---|
| Demo URL | `https://stellar.thesignal.directory/` |
| DealEscrow contract | `CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC` |
| Network | Stellar Testnet |
| Wallet path | Privy embedded Stellar wallet |
| Settlement token | Demo test USDC-compatible SEP-41 token |
| Test USDC contract | `CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX` |
| XLM SAC | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Stellar Broker testnet route | Broker adapter using seeded Soroswap router liquidity |
| Soroswap router | `CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD` |
| Seeded pool/pair | `CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5` |
| Seeded reserves | `9,000 XLM + 2,000 test USDC` |

The demo test USDC token is not Circle-issued USDC. It is a testnet settlement token used because public Soroban testnet liquidity can be unavailable after testnet resets. The UI and docs disclose this as demo/testnet configuration.

## Deliverable 4 Evidence

**Claim:** Deploy DealEscrow to Soroban Testnet and connect it to the marketplace frontend. Demonstrate wallet connection, deal creation, escrow funding, milestone validation, and automatic split payout.

**Code paths:**

- Contract: `contracts/deal_escrow/src/lib.rs`
- Contract tests: `contracts/deal_escrow/src/test.rs`
- Frontend contract hook: `frontend/src/hooks/useDealEscrow.ts`
- Deal creation UI: `frontend/src/components/CreateDeal.tsx`
- Deal lifecycle UI: `frontend/src/components/DealDashboard.tsx`
- Privy signing bridge: `frontend/src/lib/privy-stellar.ts`

**Video evidence to capture:**

- Privy wallet connected on Stellar Testnet
- Security Audit preset selected
- Deal created on testnet
- Milestone funded
- Milestone released
- Provider / connector / protocol split shown in UI
- Stellar Expert links for create, fund, and release transactions

**Fresh demo transaction hashes:**

```text
create_deal tx:     <fill after recording>
fund milestone tx:  <fill after recording>
release tx:         <fill after recording>
```

## Deliverable 5 Evidence

**Claim:** Off-chain listener monitors DealEscrow events and synchronizes on-chain state with the marketplace backend / Payload CMS.

**Published schema and procedure:**

- Event schema: `docs/EVENT_SCHEMA.md`
- Smoke test procedure: `docs/scf/tranche2-d5-smoke-test.md`

**Events emitted by DealEscrow:**

- `created`
- `funded`
- `released`
- `done`
- `dispute`
- `resolved`
- `refund`

**Video evidence to capture:**

- Payload CMS `escrow-transfers` collection filtered to `chain = stellar`
- Fresh `created`, `funded`, `released`, and/or `done` rows after demo transactions
- `sorobanContractAddress`
- `sorobanDealId`
- `sorobanEventTopic`
- `sorobanEventData`
- `onchainTxHash`
- Indexer cursor/telemetry in `stellar-indexer-state`

## Deliverable 6 Evidence

**Claim:** Stellar Broker integration enables clients to fund escrow with a non-USDC Stellar asset, routes into the standardized settlement asset, and deposits that settlement asset into DealEscrow.

**Code paths:**

- Broker-facing adapter: `frontend/src/lib/stellarBroker.ts`
- Testnet route adapter: `frontend/src/lib/soroswapOnchain.ts`
- Swap orchestration: `frontend/src/hooks/useSwapThenCreateDeal.ts`
- Swap UI: `frontend/src/components/AssetSwapStep.tsx`
- Liquidity setup notes: `scripts/README.md`

**Current testnet route:**

The frontend exposes a Stellar Broker funding step. On testnet, the broker adapter executes through the seeded Soroswap router route because public indexed testnet liquidity is unstable after resets.

**Video evidence to capture:**

- Wallet starts with XLM available for payment
- Source Asset set to `XLM -> test USDC - Stellar Broker testnet route`
- Broker quote returns the XLM input and test USDC settlement amount
- Swap transaction signs and confirms
- Explorer link shows the swap transaction
- Create/fund flow uses the configured test USDC settlement token

**Fresh demo transaction hashes:**

```text
broker swap tx:     <fill after recording>
escrow fund tx:     <fill after recording>
```

## Suggested Reviewer Wording

Use this wording in the video/readme when describing D6:

> The frontend integrates a Stellar Broker funding step. For this testnet demo, the broker adapter routes XLM through a seeded Soroswap testnet pool into a demo USDC-compatible settlement token, because public testnet liquidity can be unavailable after resets. The escrow contract receives the settlement asset, while the client funds from XLM.

This keeps the deliverable claim intact while making the testnet liquidity setup explicit.
