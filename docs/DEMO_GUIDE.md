# Demo Guide

A step-by-step walkthrough of the complete DealEscrow demo flow on Stellar Testnet.

## Prerequisites

Before starting, ensure you have:

1. **Wallet access**:
   - Privy embedded Stellar wallet for the Tranche 2 demo path
   - Optional fallback: Freighter, xBull, or Albedo via Stellar Wallets Kit

2. **Wallet set to Testnet**: Privy is configured for the app's testnet flow. For extension wallets, select "Test Net".

3. **The frontend running** at `http://localhost:5173`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Contract deployed** — ensure `VITE_DEAL_ESCROW_CONTRACT` is set in `frontend/.env`

---

## Step 1: Landing Page + Connect Wallet

Open `http://localhost:5173`. The landing page shows:

- **"Trust Engine."** — Space Grotesk 900, always-on RGB glitch effect. Hover to pause it.
- **Live Network Ticker** — full-width marquee showing real on-chain deal data from the contract (no wallet required). Emerald = completed, Blue = active, Amber = awaiting funding, Red = disputed.
- **Connect Wallet** — opens the unified wallet modal with Privy as the primary path and Stellar Wallets Kit extension wallets as fallback
- **Read the Docs** — links to the GitHub repo

To connect:

1. Click **Connect Wallet**
2. The connect modal appears — use Privy for the main Tranche 2 path, or choose an extension wallet fallback
3. Approve the connection/sign-in
4. Your truncated address and XLM/test USDC balances appear in the top-right header
5. The Live Network Ticker disappears and the app tabs appear

**What happens**: The app uses the unified wallet hook. Privy is preferred for the embedded Stellar wallet path, and Stellar Wallets Kit remains available as a fallback. On successful connection, it starts polling your XLM and test USDC balances every 15 seconds.

---

## Step 2: Fund Your Wallet

Navigate to the **Liquidity** tab (`Alt+1`).

### Option A: Friendbot (Free 10,000 XLM)

1. Click **Get 10,000 XLM from Friendbot**
2. Wait for confirmation (1-2 seconds)
3. A success toast appears: "Wallet funded with 10,000 XLM!"
4. Your header balance updates to reflect the new XLM

If your wallet was already funded, you'll see an info message instead: "Wallet already funded! You're ready to go."

### Option B: Stellar Broker Funding Route

1. Enter the XLM amount to swap (for the 500 test USDC demo, use about `2260`)
2. Click **Calculate Route** to fetch a broker quote
3. Review the rate and slippage tolerance (1%)
4. Click **Execute Swap**
5. Approve the transaction in Privy or your wallet
6. On success, see the test USDC amount received with an Explorer link

> **Note**: For Tranche 2 testnet review, the Stellar Broker adapter uses a seeded Soroswap router pool. The configured settlement token is demo-only test USDC, not production Circle USDC.

### Option C: Pay from Another Chain

The Liquidity tab also includes a cross-chain funding entry backed by the
NEAR Intents adapter.

1. Choose **Pay from another chain**.
2. Select the source asset, such as NEAR, Ethereum USDC, Base USDC, or Stellar
   XLM.
3. Confirm the settlement asset is the approved Stellar settlement asset shown
   by the app.
4. Enter the amount due and click **Get Quote**.
5. Review the estimated received amount, minimum received amount, quote expiry,
   quote verification state, and payment status timeline.
6. If live execution is enabled and payment instructions are returned, send the
   source-chain payment to the displayed address and memo.
7. Click **Refresh Payment Status** to follow the route through source payment,
   NEAR Intents routing, Stellar settlement, and escrow funding.

The public UI intentionally hides binding ids, raw asset ids, refund fallback
envs, JWT/readiness internals, and internal smoke terminology. The internal
binding for reviewer QA remains `mb_sig-demo-001`. NEAR Intents status is
payment-initiation evidence only. The deal is not considered escrow-funded
until the Stellar DealEscrow contract emits a `funded` event and the indexer
sees it.

---

## Step 3: Create a Deal

Navigate to the **Deploy Contract** tab (`Alt+2`).

### Quick Start

Click one of the **Quick Start** scenario buttons to pre-fill the form:

| Scenario | Amount | Milestones | Fee | Connector Share |
|----------|--------|------------|-----|-----------------|
| Security Audit | 500 settlement units | 3 (30/50/20) | 10% | 40% |
| Dev Sprint | 1,200 settlement units | 2 (50/50) | 8% | 50% |
| Advisory Retainer | 3,000 settlement units | 4 (25/25/25/25) | 15% | 30% |

Quick Start also fills in demo testnet addresses for the provider and connector.

### Manual Configuration

1. **Provider Address**: Paste the Stellar public key (G...) of the service provider
2. **Connector Address**: Paste the BD referrer's address
3. **Source Asset**: Select XLM direct, test USDC direct, or XLM -> test USDC through the Stellar Broker testnet route
4. **Total Amount**: Enter the deal total in the selected token
5. **Platform Fee**: Set the total platform fee percentage (e.g., 10%)
6. **Connector Share**: Set the connector's share of the platform fee (e.g., 40%)
7. **Milestones**: Add/remove milestones and set percentages (must sum to 100%)

The **Split Preview** at the bottom shows how each milestone release will be distributed:

```text
Example: 500 XLM deal, 10% platform fee, 40% connector share

Provider receives:    90.0%  (450 XLM per milestone release)
Connector receives:    4.0%  (20 XLM)
Protocol receives:     6.0%  (30 XLM)
Total:               100.0%
```

### Review and Submit

1. Click **Create Deal** — the app validates all inputs
2. Review the **deal summary** showing all participants, amounts, and split preview
3. Click **Create Deal on Stellar** to sign and submit
4. Watch the **transaction progress indicator**: Signing → Submitting → Confirming
5. On success, see the animated checkmark with your **Deal ID** and **transaction hash**
6. Click **View Deal Dashboard** to navigate to the Deals tab

**What happens on-chain**: The `create_deal` contract function stores the deal with all participants, fee parameters, and milestone amounts. Each milestone starts in `Pending` status. The deal counter increments.

---

## Step 4: Manage the Deal

Navigate to the **Deals** tab (`Alt+3`). If you just created a deal, it appears in the left panel.

The Deals tab is a split-panel interface:

- **Left panel**: Deal list with search bar, segmented filter tabs, and per-deal cards
- **Right panel**: Full deal detail with milestone timeline, vault analytics, and event ledger

### Filter Tabs

The segmented filter bar at the top of the deal list:

| Tab | Color | Shows |
| --- | ----- | ----- |
| All | Zinc | Every deal |
| In Progress | Blue | Active deals with funded milestones |
| Awaiting Funding | Amber | Created deals with no funded milestones |
| Completed | Emerald | All milestones released |
| Disputed | Red | At least one disputed milestone |
| Cancelled | Zinc | Refunded deals |

### 4a. Fund a Milestone

1. Select a deal from the left panel
2. Find the first milestone showing **Pending** status
3. Click **Fund** — the app checks your balance first
4. Approve the token transfer in your wallet
5. The milestone transitions to **Funded** and the deal becomes **Active**

**What happens on-chain**: The `deposit` function executes a SAC `transfer()` from your wallet to the contract address. The tokens are held in escrow until released or refunded.

### 4b. Release a Milestone (3-Way Split)

1. On a **Funded** milestone, click **Approve & Release**
2. Review the **confirmation modal** showing exact split amounts:
   - Provider receives: X TOKEN
   - Connector receives: Y TOKEN
   - Protocol receives: Z TOKEN
3. Click **Confirm Release**
4. Watch the **3-Way Split Visualization** — an animated bar chart showing the atomic distribution

**What happens on-chain**: The `release_milestone` function computes and executes three `transfer()` calls in a single atomic transaction. If any transfer fails, all are rolled back. The milestone becomes `Released`.

**When all milestones are released**: The deal transitions to `Completed` and the provider's on-chain reputation counter increments by 1.

### 4c. Dispute a Milestone

Either the client or provider can dispute a funded milestone:

1. Click **Dispute** on a **Funded** milestone
2. Confirm in the modal: "Disputing will freeze this milestone"
3. The milestone transitions to **Disputed** and the deal becomes **Disputed**
4. A toast notification confirms: "Dispute filed on-chain"

**What happens on-chain**: The `dispute` function requires `caller.require_auth()` and checks that the caller is either the client or provider. The milestone is frozen — no releases or further deposits possible.

### 4d. Resolve a Dispute (Operator / Admin)

The browser demo does not expose an admin refund-slider UI. In the current
frontend, disputed milestones show an **Under review** banner, and the client
can optionally choose **Accept & Release to Provider** as a settlement override.

For operator/admin resolution, call the contract's `resolve_dispute` function
from an admin-controlled tool or future operator console:

1. Confirm the connected admin/operator key is the contract admin
2. Choose the refund split:
   - 0%: All funds go to provider
   - 50%: Equal split between client and provider
   - 100%: Full refund to client
3. Submit `resolve_dispute(deal_id, milestone_idx, refund_bps)`
4. Verify the resulting `resolved` Soroban event in the indexer/dashboard

**What happens on-chain**: The `resolve_dispute` function (admin-only) transfers the refund portion to the client and the remainder to the provider. A provider win becomes `Released`, a full client refund becomes `Refunded`, and a partial settlement becomes `Resolved`.

---

## Step 5: Check Reputation

Navigate to the **Oracle** tab (`Alt+4`).

1. Your wallet address is pre-filled
2. Click **Lookup** to query the on-chain reputation
3. See the animated count-up display with your completed deal count
4. Badge tiers are awarded based on completed deals:
   - **New Provider**: 0 deals
   - **Verified Provider**: 1+ deals
   - **Trusted Provider**: 5+ deals
   - **Elite Provider**: 10+ deals

**What happens on-chain**: The `get_reputation` function reads a persistent counter stored per provider address. This counter is incremented atomically when the final milestone of a deal is released. It cannot be modified outside of completed deal flows.

To verify, click **View Contract on Explorer** to see the contract's storage on Stellar Expert.

---

## Verification Checklist

After completing the full flow, verify:

| Check | How to Verify |
|-------|---------------|
| Deal created on-chain | Transaction hash links to Stellar Explorer |
| Tokens held in escrow | Contract balance increases after deposit |
| 3-way split is atomic | Single transaction hash, three transfer operations visible on Explorer |
| Split amounts are exact | Provider + Connector + Protocol = Milestone Amount |
| Reputation increments | Lookup shows 1 after first completed deal |
| Dispute freezes funds | Disputed milestone cannot be released |
| Resolution distributes correctly | Operator/admin `resolve_dispute` evidence shows client + provider portions sum to original milestone amount |
| NEAR funding does not overclaim | NEAR panel can show quote/status, but escrow remains unfunded until a Soroban `funded` event exists |

---

## Common Scenarios to Demonstrate

### Scenario 1: Happy Path (2 minutes)

1. Quick Start → "Security Audit"
2. Create deal
3. Fund all 3 milestones
4. Release milestones 1, 2, 3
5. Check Oracle tab → shows 1 completed deal

### Scenario 2: Dispute Handling (3 minutes)

1. Quick Start → "Dev Sprint"
2. Create deal
3. Fund milestone 1
4. Release milestone 1 (normal flow)
5. Fund milestone 2
6. Dispute milestone 2
7. Show the Disputed state and **Under review** banner
8. Optionally reconnect as client and use **Accept & Release to Provider**
9. For admin split resolution evidence, run an operator/admin `resolve_dispute` smoke outside the browser UI

### Scenario 2b: Cross-Chain Funding Unhappy Path (2 minutes)

1. Open Liquidity and use **Pay from another chain**.
2. If cross-chain payments are unavailable, capture the product-facing
   availability message and confirm the quote button is unavailable or returns
   a clear payment-route error.
3. If the protected reviewer session is missing, sign in through `/admin`, then
   retry the quote without exposing the admin session details in screenshots.
4. Capture any failed/refunded/provider-pending status as payment status only;
   do not mark the escrow funded unless a matching Soroban `funded` event is
   visible.

### Scenario 3: Multiple Deals + Reputation (3 minutes)

1. Create 2 simple deals (1 milestone each)
2. Fund and release both
3. Check Oracle tab → shows 2
4. Demonstrate that reputation counter is cumulative and on-chain

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+1` | Switch to Liquidity tab |
| `Alt+2` | Switch to Deploy Contract tab |
| `Alt+3` | Switch to Deals tab |
| `Alt+4` | Switch to Oracle tab |
| `Escape` | Close confirmation modals |

Only active when wallet is connected.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Wallet not connected" | Click Connect Wallet in the header. Ensure your wallet extension is set to Testnet. |
| "Insufficient balance" | Go to the Liquidity tab and use Friendbot to get 10,000 XLM. |
| "Transaction cancelled by user" | You declined the signing prompt in Privy or your wallet extension. Try the action again. |
| "Transaction confirmation timed out" | The Stellar network may be congested. Check Stellar Explorer for your transaction status. |
| "Transaction simulation failed" | The contract rejected the operation. Ensure the milestone is in the correct state (e.g., must be Funded before Release). |
| Connector cannot dispute | This is expected. Only the client or provider can dispute funded milestones. |
| Admin resolution button missing | This is expected in the browser demo. Use the operator/admin contract path for `resolve_dispute` evidence. |
| Friendbot returns "already funded" | Your wallet already has XLM. This is not an error — proceed to Deploy Contract. |
| Soroswap quote fails | The seeded testnet route may lack liquidity for that size, or the optional public aggregator may not discover the route. Use XLM directly as the payment token or seed the testnet pool and retry. |
| Balance shows 0 after Friendbot | Wait a few seconds for the balance refresh (every 15s), or switch tabs to trigger a refresh. |
| Live Ticker not showing | The ticker requires at least one on-chain deal. Create a deal first, then reload the landing page. |
