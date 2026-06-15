# Escrow Stellar Indexer

Small isolated indexer for SCF #42 Tranche 2 Deliverable 5.

It reads DealEscrow events from Soroban RPC, decodes the known escrow topics,
writes `chain=stellar` rows into a Mongo collection shaped like Payload's
`escrow-transfers`, and stores its checkpoint in `stellar-indexer-state`.

It does not:

- write to chain
- create deals
- release escrow
- mutate marketplace `deals` or `milestones`
- trigger marketplace listings, SEO, Telegram, or matching flows

## Data Flow

```txt
DealEscrow contract event
  -> Soroban RPC getEvents
  -> parseEscrowEvent()
  -> escrow-transfers
  -> stellar-indexer-state cursor update
```

## Collections

The indexer writes two Mongo collections:

- `stellar-indexer-state` — control/checkpoint state
- `escrow-transfers` — decoded event rows

Rows are intentionally isolated:

```json
{
  "chain": "stellar",
  "metadata": {
    "source": "scf-tranche-2-demo",
    "environment": "testnet",
    "linkedToMarketplaceDeal": false
  }
}
```

## Setup

```bash
cd indexer
npm install
cp .env.example .env
```

Use a separate demo/staging Mongo database:

```env
DATABASE_URI=mongodb+srv://<user>:<password>@<cluster>/escrow-stellar-demo?retryWrites=true&w=majority
```

Minimum env:

```env
DATABASE_URI=mongodb://127.0.0.1:27017/escrow-stellar-demo
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
DEAL_ESCROW_CONTRACT=CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
INDEXER_ENABLED=true
INDEXER_OVERLAP_LEDGERS=5
```

Optional first-run cursor:

```env
INDEXER_START_LEDGER=2588800
```

If omitted, the first run starts near the recent ledger window.

## Run Once

```bash
npm run indexer:once
```

Expected output:

```json
{
  "enabled": true,
  "fromLedger": 123,
  "latestLedger": 456,
  "fetched": 2,
  "parsed": 2,
  "inserted": 2,
  "deduped": 0,
  "skipped": 0
}
```

Run it again to verify dedupe:

```json
{
  "inserted": 0,
  "deduped": 2
}
```

## Optional Server / Inngest

Start the small server:

```bash
npm run dev
```

Routes:

- `GET /health`
- `POST /api/indexer/run-once`
- `POST /api/inngest` / `GET /api/inngest`

After deployment, sync this URL in Inngest:

```txt
https://<indexer-domain>/api/inngest
```

Inngest cannot sync until the deployed endpoint is publicly reachable.

## Single Coolify Service

The repo root `Dockerfile` builds both:

- `frontend` Vite static assets
- `indexer` Express API server

The runtime server exposes:

- `/` — frontend app
- `/health` — indexer health
- `/api/indexer/run-once` — manual indexer tick
- `/api/inngest` — Inngest sync endpoint

For this mode, deploy from the repository root and use the root `Dockerfile`,
not `frontend/Dockerfile`. Set `PORT=3000` or let the Dockerfile default handle
it.

## Review Positioning

For Tranche 2 review, describe this as:

> An isolated testnet Payload-compatible indexer that reads DealEscrow Soroban
> events, stores decoded `chain=stellar` escrow-transfer rows, and persists its
> cursor in `stellar-indexer-state`. It does not touch the production
> marketplace dealflow.
