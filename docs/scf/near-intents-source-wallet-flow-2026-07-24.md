# NEAR Intents Source Wallet Flow - 2026-07-24 19:12 BST

Scope: production UX and implementation plan for cross-chain top-up through NEAR Intents/1Click inside the deal funding step.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-24 19:12 BST | NEAR source-wallet production flow | Defined the intended dual-wallet UX: user stays logged in with Stellar/Privy wallet, then connects the selected source-chain wallet inside Add Funds from Another Chain. Prioritized EVM live execution before NEAR/Solana native connectors. | Documentation/spec gate. Existing frontend already supports live token discovery, dry quotes, and lightweight EVM address collection; live payment execution remains next build. |

## Product Rule

NEAR Intents is a wallet top-up route, not the escrow funding transaction.

```text
Source chain wallet
-> NEAR Intents / 1Click quote and payment route
-> connected Stellar wallet receives settlement asset
-> user confirms Fund Deal from Stellar wallet
-> DealEscrow emits funded events
```

Escrow state must never change only because NEAR/1Click reports payment progress. Escrow is funded only after `fund_deal` succeeds and the Stellar DealEscrow `funded` event is indexed.

## Expected User Flow

1. User logs in with Privy or Stellar Wallets Kit.
2. App creates or connects the user's Stellar wallet.
3. User creates or opens a deal.
4. User clicks **Add Funds from Another Chain** on the first pending milestone.
5. Modal locks:
   - deal ID
   - remaining amount due
   - destination settlement asset: Stellar XLM or Stellar USDC
6. User chooses:
   - source chain
   - source asset
   - source amount
7. If live execution is available for that source chain, user connects the source wallet inside the modal.
8. App requests a quote.
9. User confirms/source-pays from the source wallet.
10. UI tracks:
    - source payment pending
    - NEAR Intents routing
    - settling on Stellar
    - ready to fund deal
11. User clicks **Fund Deal** from the connected Stellar wallet.
12. DealEscrow emits `funded`.

## Wallet Model

The Stellar wallet remains the app session wallet.

The source-chain wallet is temporary and scoped to the top-up modal.

```text
App identity / escrow signer:      Stellar wallet
Cross-chain payment source:        selected source wallet
Refund route on source failure:    selected source wallet
Escrow funding signer:             Stellar wallet
```

Do not disconnect the Stellar wallet when connecting a source wallet.

Do not expose raw refund fields to users. The app derives refund routing from the connected source wallet for live execution.

## Chain Priority

### Phase 1 - EVM

Use first because browser wallet support is already closest.

Supported routes:

- Ethereum
- Base
- Polygon
- Avalanche

Implementation target:

- use EIP-1193 provider
- request wallet address
- verify selected chain or request switch
- use connected source address as `refundTo`
- request live 1Click quote
- show payment instructions/deposit address only after live route is available

### Phase 2 - NEAR Native

Requires NEAR wallet connector.

Implementation target:

- connect NEAR account
- use NEAR account as refund route
- support NEAR-native source payment
- hide fallback refund env from user

### Phase 3 - Solana

Requires Solana wallet connector.

Implementation target:

- connect Solana wallet
- use Solana address as refund route
- support Solana source quote/payment status where 1Click route is available

## UX Copy Rules

Use:

- Add funds from another chain
- Pay from
- Source chain
- Source asset
- Settlement asset
- Connect source wallet
- Get quote
- Send payment
- Ready to fund deal

Avoid:

- binding ID
- JWT
- refund env
- dry quote
- admin smoke
- raw 1Click asset IDs
- internal readiness terms

## Live Execution Gate

A route can show executable payment instructions only when:

- `NEAR_INTENTS_ENABLED=true`
- `NEAR_INTENTS_ALLOW_LIVE=true`
- source asset is supported by 1Click token discovery
- destination asset matches the deal settlement asset
- source wallet connector exists and is connected
- refund route is derived from that connected source wallet
- destination Stellar wallet exists and is eligible for the settlement asset

Otherwise the UI may show quote preview/evidence, but must label it as preview only.

## Demo Path For Grant Evidence

Recommended grant demo order:

1. Show Stellar wallet connected.
2. Create a tiny XLM or USDC deal.
3. Open Add Funds from Another Chain.
4. Pick an EVM route with 1Click liquidity.
5. Connect EVM wallet inside the modal.
6. Get live quote.
7. If tiny live source payment is approved, send payment.
8. Show Stellar wallet top-up status.
9. Click Fund Deal from Stellar wallet.
10. Show Stellar `funded` event and explorer link.

If live payment is not approved, stop at signed quote evidence and clearly label escrow as not funded yet.

## Implementation Checklist

- [x] Live 1Click token discovery.
- [x] Destination locked to deal settlement asset.
- [x] Signed quote verification.
- [x] EVM address collection direction.
- [x] Escrow funding gated on Stellar `funded`.
- [ ] EVM chain switch / chain validation.
- [ ] EVM live payment instruction flow.
- [ ] 1Click status polling tied to source payment reference.
- [ ] UI state for live success -> "Fund Deal from Stellar wallet".
- [ ] Mainnet tiny source-payment evidence.
- [ ] NEAR native wallet connector.
- [ ] Solana wallet connector.
