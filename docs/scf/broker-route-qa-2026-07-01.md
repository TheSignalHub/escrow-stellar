# Broker Route QA Notes - 2026-07-01

Scope: Gap 4 broker provider interface and failure semantics for the current
testnet Soroswap-backed provider.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-01 10:23 HKT | Broker route QA | Documented quote expiry, slippage, no-route, simulation failure, submission failure, and timeout behavior. | `npm run build` passed in `frontend/`. |

## Current Provider

```text
Provider id:       testnet-soroswap-seeded
Executable path:   soroswapOnchainClient
UI interface:      stellarBrokerClient
Quote TTL:         VITE_STELLAR_BROKER_QUOTE_TTL_SECONDS, default 3600
Slippage:          VITE_STELLAR_BROKER_SLIPPAGE_BPS, default 100 bps
```

The provider interface is intentionally marketplace-agnostic:

```ts
getQuote(assetIn, assetOut, amount, tradeType, sourceAddress)
buildTransaction(quote, fromAddress)
sendTransaction(signedXdr)
```

## Failure Semantics

| Scenario | Expected Behavior |
|---|---|
| Wallet missing for quote | `getQuote` returns an error asking the user to connect a wallet. |
| No route / no liquidity | UI shows "Broker Route Not Found"; on testnet it links to the seeded pool setup and offers XLM direct fallback. |
| High price impact | Create flow requires explicit checkbox acknowledgement before swap. |
| Quote expired | Current provider encodes a transaction deadline using the configured TTL. User should re-quote if signing/submission fails after expiry. |
| Slippage movement | Router transaction uses configured slippage tolerance. If moved beyond tolerance, transaction simulation/submission fails and UI asks user to retry. |
| Simulation failure | UI shows pool/liquidity failure copy and does not proceed to create-deal review. |
| Submission failure | UI shows swap failure and leaves deal creation blocked until user retries or selects direct funding. |
| Confirmation timeout | Provider throws timeout after polling; UI links users to check explorer when a tx hash is available. |

## Remaining Production Work

- Replace `testnet-soroswap-seeded` with a production broker/liquidity provider
  implementation.
- Add provider health checks and quote-source monitoring.
- Persist quote ids if the production provider supplies them.
- Add automated no-route/slippage tests once a stable mock provider exists.
