#!/usr/bin/env bash
#
# seed-testnet-pool.sh — one-shot seeding for the SCF #42 Tranche 2 demo.
#
# Builds + deploys a SEP-41 test USDC SAC, mints a large balance to the
# operator, and prints the address to drop into the frontend env. Pool seeding
# for the demo can be done directly with Stellar CLI against the Soroswap router.
#
# Prerequisites:
#   - stellar CLI v23+        (`stellar --version`)
#   - cargo + wasm32 target   (`rustup target add wasm32v1-none`)
#   - a Stellar testnet identity loaded into the CLI
#     (`stellar keys generate <name> --network testnet --fund`)
#
# Usage:
#   ./scripts/seed-testnet-pool.sh [identity_name] [mint_amount_units]
#
# Defaults:
#   identity_name      = "deployer"
#   mint_amount_units  = 100000           (100_000 USDC at 7 decimals)
#
# What it does:
#   1. Builds the test_usdc contract
#   2. Deploys to testnet
#   3. Initializes (admin = identity_name, name=USDC, symbol=USDC, decimals=7)
#   4. Mints mint_amount_units to identity_name
#   5. Prints the SAC address + suggested .env edit
#   6. Prints the router env needed by the frontend demo

set -euo pipefail

IDENTITY="${1:-deployer}"
MINT_UNITS="${2:-100000}"
MINT_STROOPS=$((MINT_UNITS * 10000000))   # 7 decimals
NETWORK="testnet"
WASM="target/wasm32v1-none/release/test_usdc.wasm"
WASM_OPT="target/wasm32v1-none/release/test_usdc.optimized.wasm"

# ── Pre-flight ──────────────────────────────────────────────────────────────

cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cyan "SCF #42 Tranche 2 — seed XLM/USDC testnet LP for D6 demo"
cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

if ! command -v stellar >/dev/null 2>&1; then
  red "stellar CLI not found. Install: https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli"
  exit 1
fi

if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  red "stellar identity '$IDENTITY' not found on $NETWORK"
  echo "Create one: stellar keys generate $IDENTITY --network $NETWORK --fund"
  exit 1
fi

DEPLOYER_ADDR="$(stellar keys address "$IDENTITY")"
green "✓ Using identity $IDENTITY → $DEPLOYER_ADDR"
echo

# Ensure account is funded (idempotent — Friendbot ignores existing accounts)
echo "Funding $DEPLOYER_ADDR via Friendbot (idempotent)…"
curl -s "https://friendbot.stellar.org?addr=$DEPLOYER_ADDR" >/dev/null || true
green "✓ Account funded"
echo

# ── 1. Build ────────────────────────────────────────────────────────────────

cyan "▶ Building test_usdc contract…"
stellar contract build --package test-usdc
if [ ! -f "$WASM" ]; then
  red "Build output not found at $WASM"
  exit 1
fi
green "✓ Built $(du -h "$WASM" | cut -f1)"

# Optional: optimize
if command -v stellar >/dev/null 2>&1; then
  stellar contract optimize --wasm "$WASM" --wasm-out "$WASM_OPT" 2>/dev/null || cp "$WASM" "$WASM_OPT"
fi
echo

# ── 2. Deploy ───────────────────────────────────────────────────────────────

cyan "▶ Deploying to ${NETWORK}…"
USDC_CONTRACT="$(stellar contract deploy \
  --wasm "$WASM_OPT" \
  --source-account "$IDENTITY" \
  --network "$NETWORK")"
green "✓ Deployed: $USDC_CONTRACT"
echo

# ── 3. Initialize ───────────────────────────────────────────────────────────

cyan "▶ Initializing token (admin=$IDENTITY, decimals=7, name=USDC, symbol=USDC)…"
stellar contract invoke \
  --id "$USDC_CONTRACT" \
  --source-account "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$DEPLOYER_ADDR" \
  --decimal 7 \
  --name USDC \
  --symbol USDC
green "✓ Initialized"
echo

# ── 4. Mint ─────────────────────────────────────────────────────────────────

cyan "▶ Minting ${MINT_UNITS} USDC (${MINT_STROOPS} stroops) to ${DEPLOYER_ADDR}…"
stellar contract invoke \
  --id "$USDC_CONTRACT" \
  --source-account "$IDENTITY" \
  --network "$NETWORK" \
  -- mint \
  --to "$DEPLOYER_ADDR" \
  --amount "$MINT_STROOPS"
green "✓ Minted"
echo

# Verify
BALANCE="$(stellar contract invoke \
  --id "$USDC_CONTRACT" \
  --source-account "$IDENTITY" \
  --network "$NETWORK" \
  -- balance --id "$DEPLOYER_ADDR")"
green "✓ Balance check: $BALANCE stroops in $DEPLOYER_ADDR"
echo

# ── 5. Output the env edit ──────────────────────────────────────────────────

cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bold "Next steps — drop these into the frontend env and redeploy:"
cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "  VITE_USDC_TOKEN_ADDRESS=$USDC_CONTRACT"
echo "  VITE_SOROSWAP_ROUTER_ADDRESS=CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD"
echo
echo "Stellar Expert: https://stellar.expert/explorer/testnet/contract/$USDC_CONTRACT"
echo

# ── 6. Pool note ────────────────────────────────────────────────────────────

cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bold "Pool note — seed liquidity directly with the Soroswap router"
cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "This token is demo-only test USDC, not production Circle USDC."
echo "For the current SCF #42 demo, the seeded pool is:"
echo
echo "  XLM SAC:  CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
echo "  test USDC: $USDC_CONTRACT"
echo "  router:   CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD"
echo
echo "Seed the pool from CLI by approving both assets for the router, then calling"
echo "add_liquidity. Keep enough XLM in the deployer for gas and reserves."
echo
green "Done."
