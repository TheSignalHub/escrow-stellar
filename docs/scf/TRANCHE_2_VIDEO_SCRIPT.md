# SCF #42 Tranche 2 Demo Video Script

Target runtime: 5 to 6 minutes. Record one continuous video at 1080p. The goal is to show the reviewer clear evidence for Deliverables 4, 5, and 6 without over-explaining implementation details.

## Pre-Recording Setup

Open these tabs before recording:

1. Demo app: `https://stellar.thesignal.directory/`
2. Stellar Expert contract page:
   `https://stellar.expert/explorer/testnet/contract/CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC`
3. Payload CMS `escrow-transfers` filtered to `chain = stellar`
4. Payload CMS `stellar-indexer-state`
5. GitHub repo / code editor showing:
   - `frontend/src/lib/stellarBroker.ts`
   - `frontend/src/lib/soroswapOnchain.ts`
   - `docs/EVENT_SCHEMA.md`
   - `docs/scf/TRANCHE_2_REVIEW_NOTES.md`

Confirm deployed frontend env:

```env
VITE_PRIVY_APP_ID=cmms8z22d03cv0dihy31etezu
VITE_DEAL_ESCROW_CONTRACT=CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
VITE_USDC_TOKEN_ADDRESS=CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
VITE_SOROSWAP_ROUTER_ADDRESS=CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
VITE_SOROSWAP_API_KEY=
```

Before recording:

- Connect with a fresh Privy wallet or a known test wallet.
- Request Friendbot XLM if needed.
- Pre-test one quote for `3050 XLM -> test USDC`; it should quote slightly above 500 test USDC with the current seeded pool.
- Keep the browser zoom at 100%.
- Hide personal tabs/bookmarks/notifications.

## 0:00-0:25 — Intro

On screen: demo app landing page.

Say:

> This is the SCF #42 Tranche 2 testnet demo for The Signal. I will show the full Soroban escrow lifecycle, the off-chain event indexer syncing escrow events into the marketplace backend, and the Stellar Broker multi-asset funding path where a client pays with XLM while escrow receives the USDC-compatible settlement asset.

## 0:25-1:30 — Deliverable 6: Stellar Broker Funding Setup

Actions:

1. Connect wallet with Privy.
2. Show the connected address and XLM balance.
3. Open Create Deal.
4. Select the Security Audit preset: 500 test USDC, 3 milestones.
5. Open Source Asset dropdown.
6. Select `XLM -> test USDC - Stellar Broker testnet route`.
7. Click the action that opens the broker conversion step.

Say:

> This wallet is paying with XLM. The deal total remains denominated in the settlement asset, because the escrow contract receives the standardized USDC-compatible token. The Source Asset selector triggers the Stellar Broker funding step before deal creation.

When the conversion step appears:

> On testnet, the broker adapter uses a seeded Soroswap route because public Soroban testnet liquidity can disappear after resets. The important escrow behavior is preserved: the client starts with XLM, the route converts into the settlement asset, and the escrow flow receives test USDC.

## 1:30-2:30 — Deliverable 6: Swap Transaction

Actions:

1. Hold on the quote summary.
2. Confirm the route shows XLM input and approximately 500 test USDC output.
3. Click `Swap & Continue`.
4. Sign with Privy.
5. Wait for confirmation.
6. Open the Stellar Expert tx link briefly.
7. Return to the app.

Say:

> This is the non-USDC funding transaction. The quote tells us how much XLM is needed for the 500 test USDC settlement amount. After signing, the swap settles on Stellar Testnet. The next escrow transaction can now proceed with the settlement token.

Evidence to capture:

```text
broker swap tx: <paste after recording>
```

## 2:30-3:45 — Deliverable 4: Create, Fund, Release

Actions:

1. On the review screen, show the `Swap completed` badge and explorer link.
2. Create the deal.
3. Open success state and copy/note deal id and tx hash.
4. Open dashboard.
5. Fund milestone 1.
6. Release milestone 1.
7. Hold on the split visualization.

Say:

> The deal is now created on Soroban Testnet. I will fund the first milestone, then approve release. The release executes the escrow split atomically: provider, connector, and protocol transfers happen in the same on-chain transaction.

Evidence to capture:

```text
create_deal tx:    <paste after recording>
fund milestone tx: <paste after recording>
release tx:        <paste after recording>
```

## 3:45-4:45 — Deliverable 5: Event Indexer Sync

Actions:

1. Switch to Payload CMS `escrow-transfers`.
2. Refresh.
3. Show fresh rows for the Stellar contract events.
4. Open a `released` row.
5. Show:
   - `chain = stellar`
   - `sorobanContractAddress`
   - `sorobanDealId`
   - `sorobanEventTopic`
   - `sorobanEventData`
   - `onchainTxHash`
6. Switch to `stellar-indexer-state`.
7. Show `enabled`, `lastSeenLedger`, `lastTickAt`, and processed counters.

Say:

> The off-chain listener monitors the DealEscrow contract events over Soroban RPC and writes decoded rows into Payload CMS. This gives the marketplace real-time state synchronization from on-chain events such as created, funded, released, refund, and dispute-resolution events.

If the cron has not caught up yet:

> The testnet listener runs on a cron interval, so I will refresh once after the next tick. The cursor and telemetry are visible here in the admin state.

## 4:45-5:30 — Code And Evidence Tour

Actions:

1. Show `docs/scf/TRANCHE_2_REVIEW_NOTES.md`.
2. Show `frontend/src/lib/stellarBroker.ts`.
3. Show `frontend/src/lib/soroswapOnchain.ts`.
4. Show `docs/EVENT_SCHEMA.md`.
5. Optionally show terminal test result:
   `cargo test`.

Say:

> The reviewer notes map each deliverable to code paths and transaction evidence. The frontend integrates through a Stellar Broker adapter, with the current testnet route implemented through seeded Soroswap liquidity. The event schema is published in the repo for the indexer. Contract tests cover the core escrow lifecycle.

## 5:30-5:50 — Close

Actions:

1. Return to Stellar Expert contract page.
2. Show recent operations or the fresh transaction links.

Say:

> That completes Tranche 2: escrow deployed and connected on testnet, event indexing into the marketplace backend, and multi-asset funding through the Stellar Broker testnet route. The contract address, event schema, and transaction evidence are published for review.

## Final Checklist

- Public video link opens without login.
- Fresh tx hashes are copied into `docs/scf/TRANCHE_2_REVIEW_NOTES.md`.
- Testnet contract address is visible.
- Swap tx explorer link is visible.
- Fund and release tx explorer links are visible.
- Payload CMS event row is visible.
- The video uses the terms `test USDC` and `testnet route` when discussing the seeded settlement token.
