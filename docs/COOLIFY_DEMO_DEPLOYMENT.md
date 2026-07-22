# Coolify Demo Deployment Runbook

Last updated: 2026-07-21 15:09 BST

Scope: single-service Coolify deployment for the SCF testnet demo at
`stellar.thesignal.directory`. This runbook records the required environment
shape without committing live secrets.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-01 09:28 HKT | Coolify demo deployment | Added redacted deployment env runbook for the current single-service Coolify demo. | Static documentation update. No runtime behavior changed. |
| 2026-07-01 10:31 HKT | Operations/security link | Linked deployment secrets and admin handling to the operations/security runbook. | Static documentation update. No runtime behavior changed. |
| 2026-07-01 10:36 HKT | Coolify demo env profile | Recorded the current Coolify demo environment shape with public values shown and live server secrets redacted. | Static documentation update. No runtime behavior changed. |
| 2026-07-01 12:14 HKT | NEAR Intents server env | Added disabled-by-default NEAR Intents server envs and protected route notes for SDK-backed quote/status readiness. | `npm run build` passed in `indexer/`. |
| 2026-07-01 13:39 HKT | NEAR Intents frontend route support | Documented public readiness route used by the Liquidity-tab NEAR panel. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-01 15:57 HKT | Coolify pasted-env capture | Converted the exact demo env shape into a redacted reviewer-safe Coolify checklist with public values preserved and server secrets replaced by placeholders. | Static documentation update. No runtime behavior changed. Secrets pasted outside Coolify should be rotated. |
| 2026-07-21 15:09 BST | Hardened contract release candidate | Updated Coolify env examples to point at the hardened testnet release-candidate contract. | Release-candidate contract deployed and CLI smoke passed for create/deposit/release/provider-win/client-refund/partial-settlement. Coolify redeploy still required. |

## Security Note

Do not commit live values for `DATABASE_URI`, `SOROSWAP_API_KEY`,
`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `PAYLOAD_SECRET`, or admin
credentials.

Admin authority, dispute operations, monitoring, and production hardening gaps
are tracked in [`docs/OPERATIONS_SECURITY.md`](OPERATIONS_SECURITY.md).

If these values were pasted into chat, support tickets, screenshots, or logs,
rotate them before treating the deployment as production-grade:

- MongoDB Atlas database user password
- Soroswap API key
- Inngest event key and signing key
- Payload secret
- Coolify/admin username and password

The `VITE_*` values are compiled into the frontend bundle and should be treated
as public configuration, not as secrets.

## Coolify Build Settings

Use the repository root as the deploy context. The root `Dockerfile` builds the
frontend and runs the indexer/server runtime.

Recommended settings:

```env
NIXPACKS_NODE_VERSION=22.16.0
PORT=3000
```

Coolify should expose port `3000`.

## Required Environment

### Current Demo Env Profile

This is the redacted version of the environment used for the current Coolify
demo. Public `VITE_*` values are safe to document because they are bundled into
the browser app. Server-side secrets are intentionally placeholders here.

```env
NIXPACKS_NODE_VERSION=22.16.0
PORT=3000

# Public frontend config
VITE_PRIVY_APP_ID=cmms8z22d03cv0dihy31etezu
VITE_DEAL_ESCROW_CONTRACT=CD6RMOJUTNMHC6D6ODS4IJPCLZNUSH6BE6IRK2CZI47AVOCFJ7QRIRWJ
VITE_USDC_TOKEN_ADDRESS=CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
VITE_SOROSWAP_ROUTER_ADDRESS=CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
VITE_SOROSWAP_POOL_ADDRESS=CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5

# Recommended explicit public network/profile values
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_STELLAR_EXPLORER_URL=https://stellar.expert/explorer/testnet
VITE_FRIENDBOT_URL=https://friendbot.stellar.org
VITE_SETTLEMENT_TOKEN_SYMBOL=tUSDC
VITE_SETTLEMENT_TOKEN_NAME=Demo Test USD
VITE_SETTLEMENT_TOKEN_DECIMALS=7
VITE_SETTLEMENT_MIN_UNITS=1
VITE_SETTLEMENT_ASSET_POLICY=demo-testnet
VITE_STELLAR_BROKER_PROVIDER=testnet-soroswap-seeded
VITE_STELLAR_BROKER_SLIPPAGE_BPS=100
VITE_STELLAR_BROKER_QUOTE_TTL_SECONDS=3600

# Server-side secrets: set in Coolify, do not commit
DATABASE_URI=<mongodb-atlas-uri>
SOROSWAP_API_KEY=<server-only-soroswap-api-key>
INNGEST_EVENT_KEY=<inngest-event-key>
INNGEST_SIGNING_KEY=<inngest-signing-key>
PAYLOAD_SECRET=<random-long-secret>
ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<strong-admin-password>

# NEAR Intents server-side integration: disabled unless explicitly enabled
NEAR_INTENTS_ENABLED=false
NEAR_INTENTS_ALLOW_LIVE=false
NEAR_INTENTS_API_BASE_URL=https://1click.chaindefuser.com
NEAR_INTENTS_JWT=<near-intents-jwt-if-enabled>
NEAR_INTENTS_STELLAR_DESTINATION_ASSET=<1click-stellar-asset-id-if-enabled>
NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT=<refund-account-if-enabled>
NEAR_INTENTS_QUOTE_TTL_SECONDS=300
NEAR_INTENTS_POLL_INTERVAL_SECONDS=15

# Indexer runtime
INDEXER_ENABLED=true
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
INDEXER_OVERLAP_LEDGERS=5
```

The current demo can run with only the shorter set of `VITE_*` values shown
above because the frontend has safe testnet defaults. For repeatable reviewer
deploys, keep the explicit recommended network/profile values as well.

### Pasted Demo Env Snapshot - Redacted

This section mirrors the shorter Coolify env shape used for the demo. Public
frontend values are kept as-is; private values are redacted and must be set
only in Coolify or a secrets manager.

```env
NIXPACKS_NODE_VERSION=22.16.0
PORT=3000

# Public frontend config
VITE_PRIVY_APP_ID=cmms8z22d03cv0dihy31etezu
VITE_DEAL_ESCROW_CONTRACT=CD6RMOJUTNMHC6D6ODS4IJPCLZNUSH6BE6IRK2CZI47AVOCFJ7QRIRWJ
VITE_USDC_TOKEN_ADDRESS=CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
VITE_SOROSWAP_ROUTER_ADDRESS=CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
VITE_SOROSWAP_POOL_ADDRESS=CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5

# Server-side secrets, redacted from docs
SOROSWAP_API_KEY=<rotate-and-set-in-coolify>
INNGEST_EVENT_KEY=<rotate-and-set-in-coolify>
INNGEST_SIGNING_KEY=<rotate-and-set-in-coolify>
PAYLOAD_SECRET=<rotate-and-set-in-coolify>
DATABASE_URI=<rotate-mongodb-password-and-set-in-coolify>
ADMIN_USERNAME=<set-in-coolify>
ADMIN_PASSWORD=<rotate-and-set-in-coolify>

# Indexer runtime
INDEXER_ENABLED=true
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
INDEXER_OVERLAP_LEDGERS=5
```

Because the private values were pasted into chat, treat them as exposed. Rotate
the MongoDB Atlas password, Soroswap key, Inngest keys, Payload secret, and
admin password before relying on this deployment for anything beyond a temporary
demo.

### Public Frontend Config

These values are visible to browser users because Vite exposes `VITE_*` env vars
at build time.

```env
VITE_PRIVY_APP_ID=<privy-app-id>
VITE_DEAL_ESCROW_CONTRACT=CD6RMOJUTNMHC6D6ODS4IJPCLZNUSH6BE6IRK2CZI47AVOCFJ7QRIRWJ
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_STELLAR_EXPLORER_URL=https://stellar.expert/explorer/testnet
VITE_FRIENDBOT_URL=https://friendbot.stellar.org
VITE_USDC_TOKEN_ADDRESS=CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
VITE_SETTLEMENT_TOKEN_SYMBOL=tUSDC
VITE_SETTLEMENT_TOKEN_NAME=Demo Test USD
VITE_SETTLEMENT_TOKEN_DECIMALS=7
VITE_SETTLEMENT_MIN_UNITS=1
VITE_SETTLEMENT_ASSET_POLICY=demo-testnet
VITE_STELLAR_BROKER_PROVIDER=testnet-soroswap-seeded
VITE_STELLAR_BROKER_SLIPPAGE_BPS=100
VITE_STELLAR_BROKER_QUOTE_TTL_SECONDS=3600
VITE_SOROSWAP_ROUTER_ADDRESS=CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
VITE_SOROSWAP_POOL_ADDRESS=CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5
```

Note: verify the pool address before deploy. The current SCF demo pool in the
repo README is:

```text
CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5
```

### Server Secrets

Set these only in Coolify environment variables or a trusted secrets manager.

```env
DATABASE_URI=mongodb+srv://<user>:<password>@<cluster>/escrow-stellar-demo?retryWrites=true&w=majority
SOROSWAP_API_KEY=<server-only-soroswap-api-key>
INNGEST_EVENT_KEY=<inngest-event-key>
INNGEST_SIGNING_KEY=<inngest-signing-key>
PAYLOAD_SECRET=<random-long-secret>
ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<strong-admin-password>
```

### NEAR Intents Server Config

Keep these server-only. Do not prefix them with `VITE_`.

```env
NEAR_INTENTS_ENABLED=false
NEAR_INTENTS_ALLOW_LIVE=false
NEAR_INTENTS_API_BASE_URL=https://1click.chaindefuser.com
NEAR_INTENTS_JWT=<near-intents-jwt-if-enabled>
NEAR_INTENTS_STELLAR_DESTINATION_ASSET=<1click-stellar-asset-id-if-enabled>
NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT=<refund-account-if-enabled>
NEAR_INTENTS_QUOTE_TTL_SECONDS=300
NEAR_INTENTS_POLL_INTERVAL_SECONDS=15
```

Leave `NEAR_INTENTS_ALLOW_LIVE=false` until a live tiny-amount QA path, refund
handling, and the approved Stellar destination asset id are verified.

### Indexer / Network Config

```env
INDEXER_ENABLED=true
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
INDEXER_OVERLAP_LEDGERS=5
```

Optional first-run indexer cursor:

```env
INDEXER_START_LEDGER=<recent-ledger-within-rpc-retention>
```

Stellar public RPC rejects cursors outside its retention window. During the
2026-07-01 Gap 1 smoke, `2588800` was too old and the live accepted range began
around `3249889`. Prefer a recent ledger before known demo transactions.

## Runtime Routes

After deployment:

```text
/                         Frontend app
/market_dashboard         Public read-only reviewer dashboard
/admin                    Basic-auth internal admin placeholder
/health                   Service health JSON
/api/indexer/run-once     Protected manual indexer run
/api/marketplace-bindings Protected shadow binding APIs
/api/near-intents/readiness Public non-secret NEAR feature/config readiness
/api/near-intents/tokens  Protected NEAR Intents token list
/api/marketplace-bindings/:bindingId/near-intents/* Protected NEAR quote/status APIs
/api/inngest              Inngest endpoint
/api/soroswap/quote       Server-side Soroswap quote proxy
```

`/admin` and protected API routes require `ADMIN_USERNAME` and
`ADMIN_PASSWORD`.

## Deployment Checklist

1. Set all env vars in Coolify.
2. Deploy from the repository root, not `frontend/`.
3. Open `/health` and confirm the configured testnet contract address.
4. Open `/market_dashboard` and confirm the public dashboard loads.
5. Sync the Inngest endpoint:

```text
https://stellar.thesignal.directory/api/inngest
```

6. Run a manual protected indexer tick from `/admin` or:

```bash
curl -u "$ADMIN_USERNAME:$ADMIN_PASSWORD" \
  -X POST https://stellar.thesignal.directory/api/indexer/run-once
```

7. For final-tranche marketplace proof, seed or create shadow bindings and run
   reconciliation through the protected API or the indexer CLI.

## Demo Boundary

This deployment is a Stellar testnet demo:

- The settlement asset is demo test USDC, not production Circle USDC.
- Friendbot/testnet funding assumptions are not production behavior.
- The indexer database is an isolated read model, not The Signal production
  marketplace database.
- Shadow marketplace bindings prove adapter compatibility without mutating live
  marketplace collections.
