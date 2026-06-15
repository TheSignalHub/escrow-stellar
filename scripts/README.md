# Scripts

## `seed-testnet-pool.sh`

Deploys a demo test USDC token and supports seeding an XLM/test-USDC
liquidity pool used by the Stellar Broker testnet route for the SCF #42
Tranche 2 D6 demo.

### Why this exists

At Tranche 2 submission time the public XLM/USDC route had no reliable
liquidity on Soroban Testnet after network resets. The demo therefore uses
a clearly labeled SEP-41 test USDC token and a seeded XLM/test-USDC pool.
This proves the multi-asset escrow funding path without claiming the token
is production Circle USDC.

The token deployment/mint takes ~5 minutes wall-clock. Pool seeding is done
directly from the Stellar CLI against the Soroswap router.

### Prerequisites

- Stellar CLI v23+ — <https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli>
- Rust + `wasm32v1-none` target

  ```bash
  rustup target add wasm32v1-none
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
5. Prints the SAC address — paste it into `VITE_USDC_TOKEN_ADDRESS`
6. Prints the router address required by the frontend demo

### After running

1. Update the deployed frontend env:

   ```
   VITE_USDC_TOKEN_ADDRESS=<address printed by the script>
   VITE_SOROSWAP_ROUTER_ADDRESS=CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
   ```

2. Trigger a redeploy on Coolify / Vercel / wherever
3. Open <https://stellar.thesignal.directory/> and connect with Privy
4. Open Create Deal → Source Asset = "XLM → test USDC — seeded testnet route"
5. The Stellar Broker testnet route should return a test USDC estimate → sign
   the swap → sign create_deal → demo continues

### Current demo pool

For the current local demo setup:

```text
XLM SAC:        CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
test USDC:      CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
Soroswap router: CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
pool/pair:      CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5
seeded reserves: 9,000 XLM + 2,000 test USDC
```

This is demo-only liquidity. It is intentionally disclosed in the frontend.

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
- The demo frontend exposes this as the Stellar Broker funding path. On
  testnet, the broker adapter calls the Soroswap router directly because public
  indexed testnet liquidity may be unavailable after resets.
  The public aggregator quote check uses the backend `SOROSWAP_API_KEY`; do not
  expose the key as a `VITE_` browser variable.
