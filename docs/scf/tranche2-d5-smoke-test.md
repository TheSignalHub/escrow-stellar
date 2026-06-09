# D5 Smoke Test — How to Verify the Indexer End-to-End

This procedure proves the Soroban event indexer works against the live Testnet contract. Use it before submitting Tranche 2 and again whenever the indexer is touched.

## Step 1 — Static pipeline check (no Payload involvement)

Run the offline smoke test:

```bash
cd the-signal
npx tsx scripts/verify-soroban-indexer.ts
```

**Pass criteria:**

- RPC reachable (`latestLedger` printed)
- No parse errors (`parseErrors=0`)
- Script exits 0

This validates `sorobanRpc.ts` + `eventParser.ts` against the real testnet endpoint without writing anything to the DB. Existing testnet events outside the ~7-day retention window will not appear (this is expected — the RPC simply doesn't keep them).

To target a specific older window:

```bash
STELLAR_START_LEDGER=2588800 npx tsx scripts/verify-soroban-indexer.ts
```

If `startLedger` is outside the retention window the RPC returns `-32600` with a clear error message — that's expected behavior, not a regression.

## Step 2 — Generate a fresh testnet event

The retention window only goes back ~7 days, so to exercise the live indexer you need a recent event:

1. Open the demo: <https://stellar.thesignal.directory/>
2. Connect a wallet (Freighter or Privy)
3. Fund a milestone OR release one — either action emits a contract event
4. Note the resulting tx hash from Stellar Expert

Re-run the smoke test:

```bash
npx tsx scripts/verify-soroban-indexer.ts
```

You should now see at least one event with the corresponding topic (`funded` or `released`).

## Step 3 — Seed the indexer cursor and turn it on

1. Open `/admin/globals/stellar-indexer-state`
2. Set:
   - `contractAddress`: `CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC`
   - `network`: `testnet`
   - `rpcUrl`: `https://soroban-testnet.stellar.org`
   - `lastSeenLedger`: the value suggested by Step 1's script (a few hundred ledgers before your fresh event)
   - `overlapLedgers`: `5`
   - `enabled`: `true`
3. Save

The Inngest cron `soroban-event-listener` will fire on the next minute boundary. Watch:

- Telegram **SYSTEM_LOGS** thread for the indexer summary (only fires when events are processed)
- `/admin/collections/escrow-transfers?where[chain][equals]=stellar` — new rows should appear
- `/admin/globals/stellar-indexer-state` — `lastTickAt`, `lastTickStatus`, `lastTickEventsProcessed` update each tick

## Step 4 — Verify the data shape

Open one of the new rows. Expected fields populated:

- `chain` = `stellar`
- `sorobanContractAddress` = the contract address
- `sorobanDealId` = the on-chain `deal_id`
- `sorobanMilestoneIdx` = milestone index (if topic carries it)
- `sorobanEventTopic` = `created` / `funded` / `released` / etc.
- `sorobanEventId` = `<ledger>-<seq>` (unique)
- `sorobanLedgerSeq` = ledger number
- `sorobanEventData` = full parsed payload as JSON (source of truth for i128 precision)
- `onchainTxHash` = tx hash on Stellar Expert
- `amount` = whole-unit USDC amount (converted from stroops)
- For `released`: `platformCommission` = `connectorCut + protocolCut`

## Step 5 — Dedupe sanity check

Trigger the indexer twice in a row from the Admin (or wait for two cron ticks):

```
POST /api/inngest/trigger
{ "agentId": "soroban-event-listener" }
```

The second run should report `deduped > 0, inserted = 0` for the events it already processed. No duplicate rows should appear in `escrow-transfers`.

## Step 6 — Failure path

Temporarily set `rpcUrl` to a bad URL in the global, trigger the agent. Expected:

- The tick fails
- The DLQ handler routes a failure notification to the Telegram **ERRORS** thread
- The next successful tick (after fixing the URL) resumes from the same `lastSeenLedger` — no events lost

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `startLedger must be within ledger range X - Y` | Cursor older than retention | Update `lastSeenLedger` to a value inside the window |
| `parsed=0` despite known events | Wrong `contractAddress` or events past retention | Verify the address in the global matches what's deployed |
| All events skip with `skipped > 0` | Events are not from DealEscrow (e.g. diagnostic events on the same contract address) | Expected — `parseEvents` skips them silently |
| Tick succeeds but no row in Payload | Indexer disabled or kill-switch on | Check `enabled = true` in the global |
| Tick succeeds but Telegram silent | Quiet-mode behavior — Telegram only fires when `inserted > 0` | Expected — check `/admin/globals/stellar-indexer-state` for `lastTickAt` |
