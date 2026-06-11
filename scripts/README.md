# Scripts

## `seed-testnet-pool.sh`

Seeds the XLM/USDC liquidity pool on Soroswap testnet that the SCF #42
Tranche 2 D6 demo (multi-asset funding via the aggregator) needs to
prove the swap path on-chain.

### Why this exists

At Tranche 2 submission time the XLM/USDC pair has zero liquidity across
all three aggregator-routed DEXes on Soroban Testnet (Soroswap, Phoenix,
Aqua). The DealEscrow integration is fully shipped, but the swap can't
settle because there is no pool to route through. This script deploys
a SEP-41 test USDC SAC, mints a large balance to the operator, and walks
through the single manual click required to LP it against XLM on
Soroswap's testnet UI.

The whole thing takes ~5 minutes wall-clock.

### Prerequisites

- Stellar CLI v23+ — <https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli>
- Rust + `wasm32-unknown-unknown` target

  ```bash
  rustup target add wasm32-unknown-unknown
  ```

- A Stellar testnet identity with the CLI:

  ```bash
  stellar keys generate deployer --network testnet --fund
  ```

### Run

```bash
chmod +x scripts/seed-testnet-pool.sh
./scripts/seed-testnet-pool.sh
```

Defaults:

- identity name: `deployer`
- mint amount: `100000` USDC (i.e. 100k units, 10^12 stroops at 7 decimals)

Override either:

```bash
./scripts/seed-testnet-pool.sh leo-testnet 250000
```

### What it does

1. Builds the [`test_usdc`](../contracts/test_usdc/) SEP-41 token contract
2. Deploys it to Soroban testnet
3. Initializes the contract (`admin`, `name=USDC`, `symbol=USDC`, `decimals=7`)
4. Mints the requested amount to the deployer
5. Prints the SAC address — paste it into `VITE_USDC_TOKEN_ADDRESS` in the
   frontend env and redeploy
6. Prints instructions for the final manual click: LP a XLM/USDC pair on
   <https://testnet.soroswap.finance/pools>

### After running

1. Update the deployed frontend env:

   ```
   VITE_USDC_TOKEN_ADDRESS=<address printed by the script>
   ```

2. Trigger a redeploy on Coolify / Vercel / wherever
3. Open <https://stellar.thesignal.directory/>, connect Freighter
4. Open Create Deal → Source Asset = "XLM → USDC — swap via aggregator (D6 path)"
5. The aggregator now finds the XLM/USDC pool we just seeded and returns
   a real quote → sign the swap → sign create_deal → demo continues

### Verification

The deployed token contract can be inspected with the standard SEP-41
read methods:

```bash
stellar contract invoke --id <USDC_ADDR> --network testnet \
  -- name

stellar contract invoke --id <USDC_ADDR> --network testnet \
  -- symbol

stellar contract invoke --id <USDC_ADDR> --network testnet \
  -- decimals

stellar contract invoke --id <USDC_ADDR> --network testnet \
  -- balance --id <YOUR_G_ADDRESS>
```

The token also appears on Stellar Expert:
`https://stellar.expert/explorer/testnet/contract/<USDC_ADDR>`

### Notes

- The `test_usdc` contract is intentionally minimal (~250 LOC). It implements
  SEP-41 (the soroban-sdk `TokenInterface`) plus an admin-only `mint`. The
  admin can mint freely and reassign via `set_admin`. This is fine for a
  testnet demo — do not reuse on mainnet.
- The LP step uses Soroswap's testnet UI because the router's `add_liquidity`
  call requires assembling a multi-instruction tx that is more painful via
  CLI than via the well-tested UI. If Soroswap's UI moves, the script's
  final instructions need to be updated.
