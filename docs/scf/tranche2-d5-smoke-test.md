# D5 Smoke Test — Verify the Isolated Indexer

This procedure proves Deliverable 5 without touching production marketplace
dealflow. The isolated indexer lives in [`indexer`](../../indexer).

## Step 1 — Configure the Demo Database

Use a separate Mongo database, not production:

```env
DATABASE_URI=mongodb+srv://<user>:<password>@<cluster>/escrow-stellar-demo?retryWrites=true&w=majority
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
DEAL_ESCROW_CONTRACT=CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
INDEXER_ENABLED=true
INDEXER_OVERLAP_LEDGERS=5
```

Optional: set `INDEXER_START_LEDGER` to a recent ledger before a known escrow
transaction. If omitted, the first run starts near the recent ledger window.

## Step 2 — Run Once Locally

```bash
cd indexer
npm install
cp .env.example .env
npm run indexer:once
```

Pass criteria:

- RPC is reachable.
- The command exits 0.
- `stellar-indexer-state` is created or updated.
- Any recent DealEscrow events are inserted into `escrow-transfers`.

Expected output shape:

```json
{
  "enabled": true,
  "fromLedger": 123,
  "latestLedger": 456,
  "fetched": 1,
  "parsed": 1,
  "inserted": 1,
  "deduped": 0,
  "skipped": 0
}
```

## Step 3 — Generate a Fresh Testnet Event

The Soroban RPC retention window is limited, so generate a fresh event if the
indexer sees no records:

1. Open <https://stellar.thesignal.directory/>
2. Connect with Privy.
3. Create a deal, fund a milestone, or release a milestone.
4. Copy the Stellar Expert transaction hash.
5. Run `npm run indexer:once` again.

You should see `created`, `funded`, `released`, or `done` in
`escrow-transfers.sorobanEventTopic`.

## Step 4 — Verify Stored Rows

Check Mongo collection `escrow-transfers`.

Expected fields:

- `chain = "stellar"`
- `sorobanContractAddress`
- `sorobanDealId`
- `sorobanMilestoneIdx` when applicable
- `sorobanEventTopic`
- `sorobanEventId`
- `sorobanLedgerSeq`
- `sorobanEventData`
- `onchainTxHash`
- `amount`
- `platformCommission`
- `metadata.source = "scf-tranche-2-demo"`
- `metadata.linkedToMarketplaceDeal = false`

Check Mongo collection `stellar-indexer-state`.

Expected fields:

- `contractAddress`
- `network`
- `rpcUrl`
- `lastSeenLedger`
- `lastTickAt`
- `lastTickStatus`
- `lastTickEventsProcessed`
- `totalEventsProcessed`
- `enabled`

## Step 5 — Dedupe Check

Run the indexer twice:

```bash
npm run indexer:once
npm run indexer:once
```

The second run should report already-seen events as `deduped`, not duplicate
rows.

## Step 6 — Optional Inngest Check

Deploy the separate indexer app, then sync this endpoint in Inngest:

```txt
https://<indexer-domain>/api/inngest
```

Health check:

```txt
https://<indexer-domain>/health
```

Manual tick:

```txt
POST https://<indexer-domain>/api/indexer/run-once
```

Inngest cannot sync until `/api/inngest` is publicly deployed and reachable.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `enabled=false` in result | Kill switch disabled | Set `INDEXER_ENABLED=true` or enable the state row |
| No events found | No recent Soroban events | Create/fund/release a fresh deal and run again |
| RPC retention error | Cursor too old | Set `INDEXER_START_LEDGER` to a recent ledger |
| Duplicate key behavior | Event already indexed | Expected; second run should dedupe |
| Inngest sync cannot reach URL | App not deployed or wrong path | Deploy first, then sync `/api/inngest` |
