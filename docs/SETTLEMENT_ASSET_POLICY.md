# Settlement Asset Policy

Last updated: 2026-07-23 16:19 BST

Scope: settlement assets used by the DealEscrow contract, frontend, broker
route, indexer, and marketplace binding layer.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-23 16:19 BST | Production settlement allowlist | Clarified the product settlement boundary: escrow deals may settle only in approved Stellar USDC or native XLM, while cross-chain source assets remain flexible through supported provider routes. | `npm run build` passed in `frontend/`. |
| 2026-07-01 10:16 HKT | Settlement asset policy | Added explicit demo/mainnet asset policy, amount precision, minimum amount, trustline, and dust/rounding notes. | `npm run build` passed; mainnet policy-profile build passed. |

## Current Demo Asset

The SCF demo uses a testnet SEP-41 token as the configured settlement asset:

```text
Symbol:          tUSDC
Name:            Demo Test USD
Decimals:        7
SAC address:     CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
Policy profile:  demo-testnet
```

This is not production Circle-issued USDC. It exists so reviewers can reproduce
the escrow lifecycle and the XLM-to-settlement-asset funding route on Stellar
testnet.

## Production Asset Requirements

Production deal settlement is intentionally constrained to two Stellar assets:

- **Stellar USDC** for USD-denominated escrow deals.
- **Native XLM** for XLM-denominated escrow deals.

Users may still pay from flexible source assets through NEAR Intents or another
broker/provider route, but the route destination must match the deal's selected
Stellar settlement asset. A USDC deal must top up Stellar USDC; an XLM deal
must top up Stellar XLM. The escrow contract should not receive arbitrary
provider destination assets.

Before a mainnet deployment, each approved settlement asset must have:

- A verified Stellar Asset Contract address.
- Asset code, issuer, and decimals documented by operations.
- An explicit network profile: `testnet`, `staging`, or `mainnet`.
- Wallet funding and trustline instructions for clients.
- A minimum deal amount that prevents unusable dust splits.
- A broker/liquidity provider path or a direct-funding fallback for Stellar
  USDC and/or native XLM.
- A reconciliation note for the indexer and marketplace binding consumer.

Do not claim production USDC support until the mainnet SAC address, issuer,
trustline flow, and liquidity route have been verified for the deployed network.

## Frontend Configuration

```env
VITE_USDC_TOKEN_ADDRESS=<settlement-sac-address>
VITE_SETTLEMENT_TOKEN_SYMBOL=tUSDC
VITE_SETTLEMENT_TOKEN_NAME=Demo Test USD
VITE_SETTLEMENT_TOKEN_DECIMALS=7
VITE_SETTLEMENT_MIN_UNITS=1
VITE_SETTLEMENT_ASSET_POLICY=demo-testnet
```

For mainnet, use a policy label such as `approved-mainnet` and set
`VITE_SETTLEMENT_MIN_UNITS` to the minimum amount approved by operations.

## Amount Precision

The contract stores milestone amounts as integer `i128` values. The frontend
defaults to Stellar's 7-decimal precision:

```text
1.0000000 token = 10000000 contract units
```

The current frontend minimum is environment-driven and defaults to `1` whole
settlement unit. The contract itself only rejects zero or negative amounts; the
frontend and marketplace adapter are responsible for enforcing practical
minimums.

## Rounding And Dust

Release split math is deterministic and integer-only:

```text
platform_fee  = amount * platform_fee_bps / 10000
connector_cut = platform_fee * connector_share_bps / 10000
protocol_cut  = platform_fee - connector_cut
provider_cut  = amount - platform_fee
```

Rounding happens through integer division:

- Provider receives `amount - platform_fee`.
- Connector receives the floored connector share.
- Protocol receives the platform-fee remainder.
- Zero-value connector/protocol transfers are skipped by the contract.

Production policy should avoid tiny milestone amounts where fee splits round to
zero or become operationally meaningless.

## Trustline And Funding Notes

- Native XLM does not require a trustline.
- Non-native Stellar assets may require wallet-side trustline setup before a
  user can receive or hold the asset.
- The current demo relies on testnet funding and a seeded broker route.
- Mainnet onboarding must document how the client obtains the approved
  settlement asset before calling `deposit`.

## Indexer And Marketplace Binding Notes

Marketplace binding records include settlement asset metadata:

```ts
settlementAsset: {
  contractAddress: string;
  symbol: string;
  decimals: number;
}
```

Consumers should treat this metadata as part of the reconciliation contract.
If a marketplace changes settlement asset policy, downstream dashboards,
exports, and support tooling must know whether amounts are testnet demo units
or production-approved settlement units.
