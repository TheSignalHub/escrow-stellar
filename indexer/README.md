# Escrow Stellar Indexer

Small isolated indexer for SCF #42 Tranche 2 Deliverable 5.

It reads DealEscrow events from Soroban RPC, decodes the known escrow topics,
writes `chain=stellar` rows into a Mongo `escrow-transfers` collection, and
stores its checkpoint in `stellar-indexer-state`.

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
ADMIN_USERNAME=reviewer
ADMIN_PASSWORD=<strong-password>
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_DEAL_ESCROW_CONTRACT=CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
SOROSWAP_API_KEY=<server-only-key>
INDEXER_ENABLED=true
INDEXER_OVERLAP_LEDGERS=5
```

The backend also accepts `DEAL_ESCROW_CONTRACT`. If both are present,
`DEAL_ESCROW_CONTRACT` wins. For the single Coolify app, using only
`VITE_DEAL_ESCROW_CONTRACT` is fine.

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
- `POST /api/indexer/run-once` — protected by `ADMIN_USERNAME` / `ADMIN_PASSWORD`
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
- `/market_dashboard` — read-only Stellar event dashboard for reviewer/demo visibility
- `/admin` — protected internal operations path for future open-deal/dispute/action queues
- `/health` — indexer health
- `/api/indexer/run-once` — protected manual indexer tick
- `/api/soroswap/quote` — server-side Soroswap public aggregator quote proxy
- `/api/market-dashboard/summary` — indexer status, deal summary, and recent events
- `/api/market-dashboard/escrow-events` — recent decoded escrow events
- `/api/inngest` — Inngest sync endpoint

For this mode, deploy from the repository root and use the root `Dockerfile`,
not `frontend/Dockerfile`. Set `PORT=3000` or let the Dockerfile default handle
it.

`INNGEST_ID` is optional. If omitted, the app uses `escrow-stellar-indexer`.

Use `SOROSWAP_API_KEY` for the public aggregator quote check. Do not expose this
as a `VITE_` variable; Vite variables are bundled into browser JavaScript.

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the deployed environment before
using `/admin`. The browser will show a Basic Auth sign-in prompt. The public
`/market_dashboard` route is intentionally read-only and has no buttons that
can mutate indexer state. Inngest scheduled runs do not depend on the admin
session.

## Review Positioning

For Tranche 2 review, describe this as:

> An isolated testnet indexer that reads DealEscrow Soroban events, stores
> decoded `chain=stellar` escrow-transfer rows in MongoDB, persists its cursor
> in `stellar-indexer-state`, and exposes a focused dashboard for reviewer
> verification. It does not touch the production marketplace dealflow.
