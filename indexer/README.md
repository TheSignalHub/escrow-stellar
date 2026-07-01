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

## Marketplace Binding Boundary

For final-tranche validation, keep this database isolated from The Signal's
production marketplace collections. If marketplace binding is demonstrated,
use a shadow adapter/collection that maps external marketplace IDs to Soroban
deal IDs without mutating live `deals`, `milestones`, matching, listings, SEO,
Telegram, or production payment records.

The intended long-term product shape is marketplace-agnostic: any service
marketplace can map its own deal and milestone IDs to DealEscrow events through
an adapter/API layer, while this indexer remains the Stellar event read model.

Marketplace bindings may include `externalPaymentIntent` metadata for NEAR
Intents or another external payment initiator. This is now a required
final-tranche integration workstream. The server-side implementation wraps
`@defuse-protocol/one-click-sdk-typescript`, but the metadata still cannot mark
escrow funds as locked unless a matching DealEscrow `funded` Soroban event has
been indexed. Quote ids, intent ids, deposit address/memo, expiry, failure,
refund references, and "settled on Stellar" state are stored for
reconciliation and support. See
[`../docs/NEAR_INTENTS_BOUNDARY.md`](../docs/NEAR_INTENTS_BOUNDARY.md).

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

## Shadow Marketplace Binding Seed

For final-tranche review, seed sanitized Signal-style marketplace bindings into the
isolated indexer database:

```bash
npm run seed:marketplace-bindings
```

Defaults:

- `SIG-DEMO-001` maps to Soroban deal `1`
- `SIG-DEMO-002` maps to Soroban deal `2`
- `bindingMode` is `shadow`
- Settlement asset defaults to the demo testnet `tUSDC` SAC

Optional overrides:

```env
MARKETPLACE_BINDING_SIG_DEMO_001_DEAL_ID=12
MARKETPLACE_BINDING_SIG_DEMO_002_DEAL_ID=13
MARKETPLACE_BINDING_CLIENT_WALLET=G...
MARKETPLACE_BINDING_PROVIDER_WALLET=G...
MARKETPLACE_BINDING_CONNECTOR_WALLET=G...
SETTLEMENT_ASSET_CONTRACT=C...
SETTLEMENT_TOKEN_SYMBOL=tUSDC
```

This seed writes only to `marketplace-bindings` in the escrow/indexer database.
It does not mutate The Signal production marketplace database.

Validation note from the 2026-07-01 Gap 1 smoke: the first seed inserted
`SIG-DEMO-001` and `SIG-DEMO-002`; the second seed updated the same bindings,
confirming the command is idempotent.

After indexing Soroban events, reconcile shadow bindings into mapped binding
events:

```bash
npm run reconcile:marketplace-bindings
```

Optional single-binding reconcile:

```env
MARKETPLACE_BINDING_ID=mb_sig-demo-001
```

Validation note from the 2026-07-01 live reconcile smoke: indexing from
`INDEXER_START_LEDGER=3250000` fetched 5 existing testnet events for Soroban
deal `51`; `SIG-DEMO-001` was bound to deal `51`; reconciliation inserted 5
mapped binding events, and a repeat reconcile deduped all 5 events.

## Optional Server / Inngest

Start the small server:

```bash
npm run dev
```

Routes:

- `GET /health`
- `POST /api/indexer/run-once` — protected by `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- `GET /api/near-intents/readiness` — public non-secret NEAR Intents feature/config readiness
- `GET /api/near-intents/tokens` — protected SDK-backed token list for confirming asset IDs
- `POST /api/marketplace-bindings` — protected shadow binding creation
- `GET /api/marketplace-bindings` — protected list of recent bindings
- `GET /api/marketplace-bindings/:bindingId` — protected binding lookup
- `GET /api/marketplace-bindings/:bindingId/events` — protected mapped binding events
- `GET /api/marketplace-bindings/by-external/:externalMarketplaceId/:externalDealId` — protected external deal lookup
- `POST /api/marketplace-bindings/reconcile` — protected reconciliation from `escrow-transfers` into binding events
- `POST /api/marketplace-bindings/:bindingId/near-intents/quote` — protected NEAR Intents quote creation; disabled unless `NEAR_INTENTS_ENABLED=true`
- `GET /api/marketplace-bindings/:bindingId/near-intents/status` — protected status polling by stored deposit address/memo
- `POST /api/marketplace-bindings/:bindingId/near-intents/deposit-tx` — protected deposit transaction hash submission to 1Click
- `POST /api/marketplace-bindings/:bindingId/near-intents/reconcile` — protected per-binding Soroban event reconciliation
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

The deployment env runbook lives in
[`../docs/COOLIFY_DEMO_DEPLOYMENT.md`](../docs/COOLIFY_DEMO_DEPLOYMENT.md).
Do not commit live `DATABASE_URI`, API keys, Inngest keys, Payload secrets, or
admin credentials.

The runtime server exposes:

- `/` — frontend app
- `/market_dashboard` — read-only Stellar event dashboard for reviewer/demo visibility
- `/market_dashboard` also shows read-only shadow marketplace bindings when seeded
- `/admin` — protected internal operations path for future open-deal/dispute/action queues
- `/health` — indexer health
- `/api/indexer/run-once` — protected manual indexer tick
- `/api/marketplace-bindings*` — protected shadow marketplace binding and reconciliation APIs
- `/api/near-intents/readiness` — public non-secret NEAR Intents readiness for the frontend panel
- `/api/near-intents/tokens` and `/api/marketplace-bindings/:bindingId/near-intents/*` — protected SDK-backed NEAR Intents APIs, disabled by default
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
