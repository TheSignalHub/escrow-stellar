# Frontend Architecture

## Overview

The frontend is a React 19 single-page application built with TypeScript 5.9, Vite 8, and Tailwind CSS v4. It provides a complete interface for interacting with the DealEscrow smart contract on the configured Stellar network — from the landing page through wallet connection, deal creation, milestone management, and reputation lookup.

Most signed escrow interactions happen directly between the browser and Stellar's Soroban RPC via `@stellar/stellar-sdk`. The deployed review stack can also run the small `indexer` backend for `/market_dashboard`, Inngest indexing, and the optional server-side Soroswap public aggregator quote check. The executable broker-style demo route in the frontend uses the on-chain Soroswap router adapter, not the public aggregator proxy.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-28 11:55 BST | Stripe onramp card simplification | Hid the in-app fiat amount/currency row from the Stripe hosted onramp card and kept only the locked XLM-on-Stellar destination summary. Payment currency selection remains inside Stripe/Link where supported. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-28 11:43 BST | Wallet Prep responsive layout | Changed the wallet overview to stack wallet and Stripe top-up cards into two rows until wide screens, and kept the embedded Stripe card vertical so copy and controls do not squeeze. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-28 11:13 BST | Stripe onramp destination reminder | Added in-card safety copy reminding users to keep the hosted Stripe/Link flow on the configured fiat currency and XLM on Stellar before continuing. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-28 11:07 BST | Wallet Prep top-up consolidation | Merged the Stripe XLM onramp action into the **Your Wallets** surface, removed duplicated funding-route copy, and removed internal status labels from Wallet Prep and Add Funds. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-28 02:41 BST | Stripe hosted XLM onramp | Added a Wallet Prep Stripe hosted onramp card and `/stripe_onramp_test` surface for connected Stellar wallets. The card creates server-side Stripe sessions for XLM delivery to the connected G-address and keeps escrow funding separate from onramp settlement. | `npm run build -- --logLevel warn` passed with existing large-chunk warning; `npm run build` passed in `indexer/`. |
| 2026-07-27 21:25 BST | Header wallet network label | Made the connected-wallet header label and Stellar Wallets Kit initialization follow `VITE_STELLAR_NETWORK`, so Privy and extension-wallet paths show/use Mainnet on the production build instead of testnet copy/config. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-26 12:43 BST | Landing network badge | Made the public landing badge read from `VITE_STELLAR_NETWORK` so production displays **Stellar Soroban Mainnet** instead of hardcoded testnet copy. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-26 00:36 BST | Mainnet inclusion fee default | Added a frontend `VITE_STELLAR_INCLUSION_FEE_STROOPS` override and defaulted mainnet escrow transactions to `10000` stroops after mainnet create/admin retries showed base inclusion fees can timeout without landing. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-26 00:14 BST | Create Deal finality recovery | Added a recoverable unconfirmed-transaction state when Create Deal polling times out after submission. The review panel now keeps the submitted hash, links to Stellar Explorer, lets the user check Deals/wallet activity, and allows an explicit retry instead of freezing on awaiting finality. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-26 00:06 BST | Deal metadata storage scope | Namespaced browser-local deal metadata and event ledger entries by Stellar network and DealEscrow contract address so same numeric deal IDs from testnet, mainnet, or older deployments no longer mix in the Deals tab. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 22:57 BST | Disputed deal pause UX | Added a deal-level paused banner for `Disputed` deals, hid normal release/dispute actions for still-funded milestones while the deal is frozen, and made timeout/error explorer URLs clickable from the Deals error panel. This matches the mainnet smoke finding that an open dispute blocks normal releases until admin resolution. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 22:22 BST | Wallet Prep XLM transfer utility | Added a browser-signed **Send XLM** Wallet Prep utility for transferring native XLM from the connected Stellar wallet, including fresh-account activation via `createAccount` when the destination is not active. This avoids private-key export while supporting operator/tester wallet movement. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 21:30 BST | Deal event ledger grouping | Grouped same-transaction `fund_deal` milestone rows in the selected deal sidebar so a full-deal funding transaction reads as one **Deal Funded** action with affected milestones listed, instead of looking like duplicate unrelated funding history. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 21:27 BST | Create Deal timeout explorer link | Derived the submitted transaction hash from the signed XDR and used it as the fallback for submitted, polling, success, and timeout explorer links so delayed finality messages never point to an empty `/tx` URL. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 21:23 BST | Create Deal mainnet finality tracking | Create Deal now receives the submitted transaction hash immediately after Soroban RPC accepts the transaction, switches the progress state to awaiting finality during polling, and shows a Stellar Explorer link while confirmation is pending. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 21:12 BST | Optional connector deal creation | Made the Create Deal connector field optional. When no connector is provided, the frontend submits the provider address as the on-chain connector recipient so the connector share is paid to the provider instead of requiring a BD referrer. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 20:24 BST | Mainnet USDC SAC selection | Confirmed mainnet Circle USDC derives to `CCW67TSZ...JMI75` and made the frontend USDC default network-aware so a missing env cannot fall back to the testnet demo USDC on mainnet. | `npm run build -- --logLevel warn` passed with existing large-chunk warning; CLI confirmed mainnet Circle USDC SAC `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`. |
| 2026-07-25 20:15 BST | Mainnet XLM SAC selection | Made native XLM SAC selection network-aware so mainnet XLM deals use `CAS3J7GY...XOWMA` instead of the testnet SAC. Added a funding guard/error for already-created mainnet deals that reference the testnet XLM SAC. | `npm run build -- --logLevel warn` passed with existing large-chunk warning; CLI confirmed mainnet native SAC `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`. |
| 2026-07-25 19:29 BST | NEAR Intents completed badge | Changed the terminal 1Click settlement badge from the internal **Awaiting escrow event** amber state to a green **Swap completed** state while keeping the separate Fund Deal reminder below. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 19:24 BST | NEAR Intents settlement success copy | Replaced internal reconcile/indexing language in the top-up success banner with a user-facing next step: funds reached the Stellar wallet, then open Deals and fund escrow. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 19:18 BST | NEAR Intents pay-card responsive fix | Changed the Add Funds **You pay** card so source amount and source selectors stack cleanly in narrow columns, preventing the chain/asset dropdowns from overlapping the amount field. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 19:12 BST | NEAR Intents status wait guidance | Added concise waiting-time guidance to the payment status copy so users understand that 1Click detection, routing, and Stellar settlement can take a few minutes after source payment submission. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 19:05 BST | NEAR Intents warning copy | Shortened the preview-only and source-wallet-required warning text in the Add Funds panel so the swap flow reads less like internal documentation while preserving the live-payment gate. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 18:50 BST | NEAR Intents swap panel polish | Reworked the Add Funds NEAR Intents input side into a cleaner swap-style surface with route chips, a larger **You pay** amount field, locked **You receive** settlement card, and compact source-wallet connection state. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 18:34 BST | NEAR Intents post-swap crash fix | Replaced the last unsafe nested status read in the settlement-complete banner with the normalized provider status so successful source swaps cannot crash the route tracking UI. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 17:08 BST | NEAR Intents status shape alignment | Verified the deployed 1Click status response shape and updated frontend tracking to read provider `originChainTxHashes` for source-chain explorer links, while retaining the prior fallback key. | Deployed status shape inspected with `inspect:near-shapes`; `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 16:58 BST | NEAR Intents response-shape QA | Added an indexer `inspect:near-shapes` command that prints deployed NEAR status/deposit-tx response keys and value types before frontend tracking changes. | `npm run inspect:near-shapes` ran and correctly blocked on missing local admin envs; `npm run build` passed in `indexer/`. |
| 2026-07-25 16:47 BST | NEAR Intents deposit tracking hotfix | Normalized the frontend handling for `/deposit-tx` responses so source-payment submission no longer crashes when the backend returns `result` instead of the status-polling shape. Guarded nested status reads during route tracking. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 16:36 BST | NEAR Intents route tracking | Added source-chain explorer links, NEAR Intents Explorer tracking links, last-checked timestamps, clearer user-facing route status labels, and auto-polling after source payment submission until terminal 1Click status. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 16:18 BST | NEAR Intents EVM source payment | Added browser-wallet source payment submission for live EVM 1Click quotes. Supported EVM routes can switch to the selected chain and submit native/ERC-20 payment to the quoted 1Click deposit address; escrow funding still requires the later Stellar Fund Deal transaction. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 15:44 BST | Wallet Prep top-up amount units | Changed standalone NEAR Intents Wallet Prep top-up amount from raw Stellar base-unit display to human Stellar units, defaulting to `10` and converting to base units only for quote estimation. Deal-aware Add Funds still displays the locked deal amount from contract units. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 15:27 BST | Wallet Prep swap balances | Added selected XLM/USDC wallet balances to the Convert on Stellar route and amount fields, plus a Max action for exact-pay swaps that leaves a small XLM fee buffer. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 15:15 BST | XLM-first settlement default | Kept Stellar USDC available as an optional settlement asset, but made the public Create Deal copy and generic Wallet Prep cross-chain top-up default to Stellar XLM first. Deal-specific Add Funds remains locked to the selected deal token. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 11:54 BST | Wallet Prep inactive-account trustline state | Split the Convert on Stellar issued-asset readiness check into inactive account versus missing trustline states. Fresh mainnet wallets now show an XLM activation reminder and block conversion before the USDC trustline action is offered. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 11:48 BST | Create Deal settlement-specific payout readiness | Refined Create Deal participant and settlement-asset copy so fresh payout addresses are allowed at creation, XLM deals are described as the simplest native payout path, and USDC deals warn that recipients need XLM reserve plus a USDC trustline before release. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 04:03 BST | Create Deal fresh payout address clarity | Added Create Deal participant copy clarifying that provider/connector payout addresses can be fresh at agreement creation and only need activation/asset receivability before milestone release. Functional validation already accepts address format only for payout recipients. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 03:57 BST | EVM source-wallet detection | Made the NEAR Intents source-wallet hook re-detect injected EVM wallets on mount, after delayed extension injection, and again on connect click. Updated the Add Funds button copy so installed wallets such as MetaMask are not presented as a dead install-only path. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 04:34 BST | Create Deal payout-address flow | Simplified mainnet Create Deal to validate pasted provider/connector payout address format only. Recipient receivability is now checked at milestone release, where the payout transfer actually happens. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 04:22 BST | Mainnet demo preset accounts | Added configurable public mainnet payout preset addresses for Create Deal quick-start scenarios, with active pilot ops-wallet fallback so mainnet smoke deals do not prefill inactive testnet accounts. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 04:06 BST | Mainnet recipient onboarding gate | Relaxed mainnet Create Deal so only the connected client wallet must be active before agreement creation. Provider/connector account activation and USDC trustline checks moved toward release-time enforcement, where funds actually move; create-time recipient warnings were later removed in the 04:34 entry. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 03:32 BST | Mainnet Stellar account readiness | Added production wallet-readiness gates: Wallet Prep flags inactive Stellar wallets, NEAR top-up quotes require an existing Stellar destination account, Create Deal began checking participant readiness, and Soroban transaction timeouts now include an explorer link with a longer confirmation window. Create-time recipient blocking was later relaxed in the 04:06 entry. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 03:21 BST | Wallet Prep advanced trustline guard | Generalized the Wallet Prep trustline check around the receive asset. Known issued Stellar assets can use the browser-signed trustline flow; unknown advanced pasted receive contracts now show a manual trustline warning and block swap execution instead of failing with `op_no_trust`. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 03:12 BST | Wallet Prep USDC trustline setup | Added a mainnet Wallet Prep action that detects when the connected Stellar wallet has not opted into Circle USDC, explains the trustline requirement, builds a browser-signed `changeTrust` transaction, and blocks USDC swap execution until the trustline exists. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 03:03 BST | Wallet Prep XLM/USDC route clarity | Updated mainnet XLM/USDC swap quotes to prefer direct Stellar DEX paths when Horizon returns multiple alternatives, avoiding misleading multi-hop rates. Swap quote/submission errors now surface Horizon/Stellar result details instead of a bare HTTP 400. | Horizon strict-receive returned direct `28 XLM -> 5 USDC` route after a misleading multi-hop candidate; `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-25 02:47 BST | NEAR Intents panel overflow cleanup | Tightened the Wallet Prep/Deals NEAR Intents panel layout so long Stellar wallet labels, source asset labels, quote metrics, and payment-flow cards wrap or truncate inside narrow columns instead of overflowing. | `npm run build -- --logLevel warn` passed; Vite reported the existing large-chunk warning. |
| 2026-07-25 01:41 BST | Wallet Prep route discovery cleanup | Removed the public diagnostic route-discovery block from Convert on Stellar so users go straight from route/amount/slippage selection to the executable **Calculate Route** quote. | `npm run build` passed in `frontend/`. |
| 2026-07-25 01:35 BST | Wallet Prep exact-receive display | Corrected the Convert on Stellar exact-receive UI so the editable target field shows the receive asset and the estimate field shows the pay asset, matching Stellar DEX strict-receive quotes. | Horizon strict-receive check returned `88.4512391` USDC for `497` XLM; `npm run build` passed in `frontend/`. |
| 2026-07-25 01:30 BST | Wallet Prep cross-chain top-up | Added the reusable NEAR Intents/1Click panel to Wallet Prep as a general cross-chain wallet top-up utility, while preserving the deal-aware top-up entry in Deals. Adjusted Wallet Prep copy/step numbering so cross-chain status is wallet top-up state, not escrow funded state. | `npm run build` passed in `frontend/`. |
| 2026-07-25 01:17 BST | Wallet Prep route selector and slippage | Replaced always-visible raw token contracts with production-shaped swap route selectors for common Stellar XLM/USDC routes, kept advanced contract paste for custom routes, and added user-selectable slippage presets/custom tolerance that are embedded into quote metadata and signed swap bounds. | `npm run build` passed in `frontend/`. |
| 2026-07-25 01:06 BST | Mainnet XLM/USDC route discovery | Updated Wallet Prep's optional route-discovery check to use Stellar DEX/Horizon pathfinding for mainnet XLM <-> Circle USDC, matching the executable quote path instead of showing a stale Soroswap no-path error. | `npm run build` passed in `frontend/`. |
| 2026-07-25 00:58 BST | Mainnet XLM/USDC DEX route | Added a mainnet Stellar DEX/Horizon pathfinding fallback for XLM <-> Circle USDC conversion so the common StellarX-visible pair no longer depends on the Soroswap/Soroban adapter path. Testnet and custom broker routes still use the existing configured adapter. | Horizon strict-send/strict-receive checks returned XLM/USDC routes; `npm run build` passed in `frontend/`. |
| 2026-07-25 00:44 BST | Wallet Prep mainnet cleanup | Hid the testnet-only settlement funding/Friendbot card outside testnet, simplified **Convert on Stellar** into an AMM-style wallet conversion surface, and removed raw router/pool config cards from the public UI while keeping custom token routes and optional route discovery. | `npm run build` passed in `frontend/`. |
| 2026-07-24 23:52 BST | Wallet Prep custom Stellar routes | Generalized **Convert on Stellar** so users can paste Stellar token contract addresses for pay/receive assets, use XLM/USDC presets, flip direction, choose exact pay or exact receive, and run route checks against the selected pair. Escrow funding remains in Deals. | `npm run build` passed in `frontend/`. |
| 2026-07-24 23:41 BST | Wallet Prep conversion wording | Renamed the Wallet Prep broker section from funding language to **Convert on Stellar**, clarified that the swap prepares the connected Stellar wallet, and kept escrow funding anchored to Deals / Fund Deal. | `npm run build` passed in `frontend/`. |
| 2026-07-24 20:21 BST | Add Funds production flow split | Split the Add Funds NEAR Intents UI into an explicit **Preview Quote** path for live 1Click route evidence and a **Get Live Payment Quote** path gated by source-wallet readiness. Added a production payment flow panel that shows the connected Stellar wallet, selected source route, source-wallet connector state, and final Fund Deal handoff. | `npm run build` passed in `frontend/`. |
| 2026-07-24 18:54 BST | Create Deal settlement labels | Aligned Create Deal settlement choices to production-directed Stellar XLM and Stellar USDC labels while retaining testnet demo USDC-compatible asset disclosures in docs/env policy. | `npm run build` passed in `frontend/`. |
| 2026-07-24 15:08 BST | Dispute UI contract alignment | Removed the disputed-milestone client release override from the Deals UI because `release_milestone` only accepts funded milestones. Disputed milestones now point to operator/admin `resolve_dispute` for provider win, client refund, or partial split. | `npm run build` passed in `frontend/`. |
| 2026-07-24 15:38 BST | Admin dispute operations surface | Added the protected `/admin` console in the indexer service for open dispute evidence, resolution/refund command generation, and manual indexer refresh. The public Deals UI remains user-side only and does not expose admin split controls. | `npm run build` passed in `indexer/`. |
| 2026-07-24 16:51 BST | Dispute notes and admin execution | Added a dispute-reason textarea to the user dispute modal, stores notes off-chain for admin review, and added optional protected `/admin` server-side resolution/refund execution behind explicit admin signer env gates. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-24 14:22 BST | EVM source-wallet quote gate | Added a lightweight EIP-1193 source-wallet connector inside the Add Funds panel. Ethereum/Base-style routes can now collect the connected EVM address as the live quote refund route, while unconnected routes remain dry preview-only. | `npm run build` passed in `frontend/`. |
| 2026-07-24 01:26 BST | Production NEAR swap evidence path | Added an indexer-side live swap smoke command for production-directed NEAR Intents QA. It creates dry quotes by default, requires explicit `--live` for executable deposit instructions, enforces a max USD cap, validates source refund address shape, and supports status polling after manual source-chain payment. | `npm run build` passed in `indexer/`. |
| 2026-07-24 00:54 BST | Add Funds route-quality UX | Ranked discovered 1Click source assets with recommended routes first, auto-estimated source amounts from live token prices when available, added friendly no-route copy, remembered successful preview routes, and surfaced a quote-evidence checklist after signed dry quotes. | `npm run build` passed in `frontend/`. |
| 2026-07-23 21:07 BST | Add Funds quote amount display | Formatted 1Click destination quote amounts in human Stellar units for XLM/USDC instead of showing raw base-unit labels in the quote summary. | `npm run build` passed in `frontend/`. |
| 2026-07-23 17:39 BST | 1Click source token discovery | Replaced hardcoded Add Funds source-token cards with live 1Click token discovery. Users now choose source chain, source asset, and source amount from supported non-Stellar routes while the destination remains locked to the deal settlement asset. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-23 17:25 BST | Multi-chain Add Funds quote previews | Enabled dry quote previews for Ethereum USDC, Base USDC, and Solana USDC using current 1Click token discovery IDs, while keeping live source-wallet execution gated until native wallet signing and refund routing are wired. | `npm run build` passed in `frontend/`. |
| 2026-07-23 17:18 BST | Add Funds dry quote amount | Split deal amount due from the 1Click dry quote source amount in deal funding mode. The modal now keeps the escrow target visible while using a fixed 1 NEAR preview amount for route evidence, avoiding false `No liquidity available` errors caused by sending Stellar base-unit amounts as NEAR base units. | `npm run build` passed in `frontend/`. |
| 2026-07-23 17:05 BST | Add Funds quote-source guard | Disabled Stellar XLM as a 1Click source inside the cross-chain Add Funds modal, because connected Stellar balances should use direct Fund Deal or Wallet Prep. NEAR without a connected source wallet now remains a dry quote preview path instead of a live source-payment path. | `npm run build` passed in `frontend/`. |
| 2026-07-23 16:34 BST | Source-wallet refund routing | Added product/API guardrails so enabled source routes derive refunds from the connected source wallet when available, hide refund fields from users, and block live source routes without source-wallet refund plumbing while preserving dry/demo quote evidence fallback. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-23 16:27 BST | Add Funds source-wallet UX | Reframed the deal-level cross-chain flow as **Add Funds from Another Chain**, clarified that NEAR Intents/1Click is the top-up quote/routing provider, and replaced disabled source-card copy with coming-next source wallet language for Ethereum/Base until those native wallet/refund paths are wired. | `npm run build` passed in `frontend/`. |
| 2026-07-23 16:19 BST | Settlement-route allowlist | Tightened deal-tied NEAR top-up routing so destination assets are limited to the deal's approved settlement currency: Stellar USDC for USDC deals or Stellar XLM for XLM deals. Source assets remain user-selectable where supported by 1Click and wallet/refund handling. | `npm run build` passed in `frontend/`. |
| 2026-07-23 15:47 BST | NEAR top-up amount and settlement matching | Updated the Deals top-up modal to display the remaining deal balance in human Stellar units instead of raw base units, pass the selected deal token into the NEAR Intents panel, and prefer a matching Stellar destination route when the configured 1Click allowlist supports the deal settlement asset. | `npm run build` passed in `frontend/`. |
| 2026-07-23 14:55 BST | NEAR Intents top-up semantics | Clarified the Deals NEAR Intents path as cross-chain wallet top-up rather than direct escrow funding. The UI now labels the action **Top Up from Another Chain** and tells users to confirm **Fund Deal** after the Stellar wallet receives funds. | `npm run build` passed in `frontend/`. |
| 2026-07-23 14:43 BST | Deal-level funding checkout | Updated the Deals tab to use `fund_deal` as the primary client funding action: the first pending milestone shows the remaining deal balance, funds all pending milestones in one transaction, and keeps releases/disputes per milestone. Cross-chain funding modal now quotes the remaining deal balance. | `cargo test` passed with 16 tests; `npm run build` passed in `frontend/`. |
| 2026-07-23 13:42 BST | Cross-chain funding modal UX | Moved pending-milestone NEAR Intents funding from inline card rendering into a focused modal overlay with Escape/backdrop close and page scroll lock, preserving selected deal/milestone/amount locking. | `npm run build` passed in `frontend/`. |
| 2026-07-23 13:33 BST | Cross-chain funding panel visibility | Moved the NEAR Intents funding panel to render directly under the clicked pending milestone and added console/toast guard logs when the flow is blocked by missing deal context or a non-pending milestone. | `npm run build` passed in `frontend/`. |
| 2026-07-23 12:08 BST | Deal-page wallet balance UX | Kept the connected wallet header compact and added a Deals sidebar wallet-balance card showing XLM and the configured settlement token beside Vault Analytics. | `npm run build` passed in `frontend/`. |
| 2026-07-23 11:46 BST | Wallet balance and ledger refresh UX | Updated the connected wallet header to expose balance context and changed Deals auto-sync to refresh silently so the left ledger list does not show loading skeletons on each polling interval. | `npm run build` passed in `frontend/`. |
| 2026-07-23 11:30 BST | Create Deal settlement-only flow | Removed the create-time XLM -> configured-settlement-token swap route from Create Deal. Create Deal now only selects the escrow settlement asset; swaps/top-ups/cross-chain payment remain in Wallet Prep or pending milestone funding. | `npm run build` passed in `frontend/`. |
| 2026-07-23 11:14 BST | Funding-time settlement balance UX | Added a pending-milestone settlement-balance check in Deals for XLM and configured settlement-token deals, disabled direct Stellar funding when the known balance is short, and kept Wallet Prep / Pay from Another Chain as recovery paths. | `npm run build` passed in `frontend/`. |
| 2026-07-23 10:54 BST | Create Deal settlement asset naming | Renamed the Create Deal financial selector from source-asset language to **Escrow Settlement Asset** language and added an internal code comment clarifying that the existing `sourceAsset` state is a funding/settlement mode selector. | `npm run build` passed in `frontend/`. |
| 2026-07-23 10:44 BST | Wallet prep boundary cleanup | Removed standalone NEAR quote UI from the wallet-prep tab, kept NEAR Intents inside pending milestone funding, renamed the support tab to **Wallet Prep**, and replaced remaining create-deal deployment copy with deal-language. | `npm run build` passed in `frontend/`. Backend/API behavior unchanged; Soroban `funded` remains the escrow source of truth. |
| 2026-07-23 10:33 BST | Deal-level NEAR funding UX | Reused `NearIntentsPanel` inside pending milestone funding so users start cross-chain payment from a selected deal/milestone with the amount locked, while keeping Wallet Prep as testnet settlement preparation. | `npm run build` passed in `frontend/`. Backend/API behavior unchanged; Soroban `funded` remains the escrow source of truth. |
| 2026-07-22 18:51 BST | Product flow naming | Renamed the public app flow from **Liquidity / Deploy Contract** to **Payment Routes / Create Deal**, updated pending milestone actions to distinguish payment-route preparation from direct Stellar funding, and forced quote-only NEAR demo destinations to remain preview-only even when live execution is enabled. | `npm run build` passed in `frontend/`. Backend behavior unchanged. |

## Component Architecture

```text
App.tsx (Root)
├── GlowingBackground          — Animated ambient background (fixed, z-0)
├── ToastContainer             — Global notification system
├── LiveTicker                 — Real-time on-chain marquee (homepage only)
├── Header
│   ├── SignalLogo             — logo.png, click-to-home when connected
│   ├── "THE SIGNAL" wordmark  — Space Grotesk 800, font-display class
│   └── ConnectWallet / Nav    — Wallet info + tab navigation when connected
├── LandingView (when disconnected)
│   ├── "Trust Engine." hero   — Glitch effect, always-on RGB aberration
│   ├── Connect Wallet CTA     — Opens unified Privy-first wallet modal
│   └── Read the Docs CTA      — Links to GitHub repo
└── App Tabs (when connected)
    ├── Wallet Prep            — SoroswapWidget (Friendbot + broker-style testnet settlement-asset prep)
    ├── Create Deal            — CreateDeal (form + review + success)
    ├── Deals                  — DealDashboard (split-panel lifecycle + deal-level settlement-balance check + NEAR funding entry)
    └── Oracle                 — ReputationBadge (on-chain reputation)
```

## Design System

### Tailwind CSS v4

Styling uses Tailwind v4 with custom properties defined in `src/index.css` via the `@theme` block (no `tailwind.config.js`):

```css
@theme {
  --animate-marquee: marquee 120s linear infinite;
  --animate-radar: radar 3s linear infinite;
  --animate-pulse-ring: pulse-ring 2s ease-in-out infinite;
  /* ... additional custom animations */
}
```

### Typography

| Usage | Font | Weight | Class |
|-------|------|--------|-------|
| "THE SIGNAL" header | Space Grotesk | 800 | `.font-display` |
| "Trust Engine." hero | Space Grotesk | 900 (font-black) | `font-black` |
| Code / addresses | JetBrains Mono | 400 | `font-mono` |
| Body | Inter | 400 | default |

Space Grotesk is loaded from Google Fonts with weights 700 and 800. JetBrains Mono and Inter are loaded via the same stylesheet.

### Glitch Effect

The "Trust Engine." heading uses a CSS-only RGB chromatic aberration effect defined in `@layer base`:

- **Always active** — `::before` (red layer) and `::after` (cyan layer) run two desynchronized keyframe animations (`glitch-1` at 4s, `glitch-2` at 3.5s)
- **Organic bursts** — Animations use `steps(1)` and have long quiet periods (85% of cycle is invisible) with sudden clip-path bursts
- **`mix-blend-mode: screen`** — Layers blend with white text for true chromatic aberration rather than plain text-shadow offsets
- **Hover pauses** — `::before` and `::after` set to `clip-path: inset(0 0 100% 0)` on hover, cleanly freezing the effect

### Shared UI Components

**`src/components/ui/Components.tsx`**

| Component | Props | Description |
|-----------|-------|-------------|
| `Card` | `className`, `hoverEffect`, `glowOnHover`, `onClick` | Dark bordered container with internal `relative z-10 h-full` wrapper. Apply flex/centering on inner content, not the Card itself. |
| `Button` | `variant`, `icon`, `disabled`, `onClick` | `primary` (emerald gradient) or `secondary` (zinc border). |
| `Tag` | `color` | Colored status badge: `emerald`, `amber`, `blue`, `red`, `zinc`. |

**`src/components/ui/Branding.tsx`**

| Component | Description |
|-----------|-------------|
| `SignalLogo` | Renders `public/logo.png` with configurable `className`. No glow effects. |
| `GlowingBackground` | Fixed full-screen layer: deep black base, architectural grid, emerald neon orbs, CRT scanline texture. |

### Live Network Ticker

**`App.tsx` — `LiveTicker` component**

A full-width marquee bar showing real on-chain deal data:

- **Read-only fetch on mount** — Calls `getDealCount()` and `getDeal()` via `useDealEscrow` without requiring wallet authentication (view functions are permissionless on Soroban)
- **Homepage only** — Hidden when `wallet.isConnected`. Disappears when the user connects and enters the app.
- **No fallback data** — If the chain is unreachable or there are no deals, the ticker is simply hidden
- **Data per deal**: Contract ID, status label (`ESCROW_ACTIVE`, `DEAL_COMPLETED`, etc.), total amount, plus per-milestone entries for funded/released milestones
- **Color coding**: Emerald = completed/released, Blue = active/funded, Amber = awaiting funding, Red = disputed
- **Scroll speed**: 120s per full cycle (very slow, cinematic)

## Custom Hooks

### `useUnifiedWallet`, `usePrivyWallet`, and `useStellarWallet`

**Files**: `src/hooks/useUnifiedWallet.ts`, `src/hooks/usePrivyWallet.ts`, `src/hooks/useStellarWallet.ts`

`useUnifiedWallet` is the app-facing wallet hook. It prefers Privy embedded Stellar wallets and falls back to Stellar Wallets Kit extension wallets while exposing a single wallet-state interface to the rest of the app.

```typescript
interface WalletState {
  address: string;
  isConnected: boolean;
  xlmBalance: string;
  usdcBalance: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  signTransaction: (xdr: string, opts?: any) => Promise<string>;
}
```

**Key features**:
- **Privy-first wallet support**: Uses Privy embedded Stellar wallets for the main demo path, with Freighter, xBull, and Albedo retained through Stellar Wallets Kit as fallbacks.
- **Auto-refresh balances**: Polls XLM and test USDC balances every 15 seconds using ref-based intervals.
- **Error-categorized signing**: Catches wallet errors and provides user-friendly messages (cancelled, unavailable, or generic failure).
- **Event-driven state**: Listens to `STATE_UPDATED` and `DISCONNECT` events from the wallet kit.
- **Disconnect resets app**: `disconnect()` clears address + balances, returning the user to the landing page (logo click when connected also calls `disconnect()`).

### `useDealEscrow`

**File**: `src/hooks/useDealEscrow.ts`

All contract interaction methods with robust error handling and transaction lifecycle management.

```typescript
function useDealEscrow(walletAddress: string, signTransaction: Function) {
  return {
    createDeal,         // Create a new escrow deal
    deposit,            // Fund a specific milestone
    releaseMilestone,   // Execute atomic 3-way split
    dispute,            // Freeze a funded milestone
    resolveDispute,     // Admin: resolve with configurable refund %
    getDeal,            // Read deal state (simulation, no signing)
    getReputation,      // Read provider reputation (simulation, no signing)
    getDealCount,       // Read total deal count (simulation, no signing)
    contractId,         // Current contract address
  };
}
```

**Transaction pipeline** (`submitContractCall`):

```text
1. Build Transaction
   └── TransactionBuilder with Stellar base fee; simulation/assembly sets the final Soroban fee

2. Simulate
   └── sorobanServer.simulateTransaction()
   └── Parse errors via friendlyError() helper

3. Assemble
   └── rpc.assembleTransaction() attaches footprint + auth

4. Sign
   └── Wallet signs via signTransaction()

5. Submit
   └── sorobanServer.sendTransaction()

6. Poll for Confirmation
   └── Max 30 retries × 2s = 60s timeout
   └── Throws on timeout or on-chain failure
```

**Safety mechanisms**:
- **Transaction mutex**: `useRef` boolean prevents concurrent/double-click transactions
- **Confirmation timeout**: Hard limit of 30 retries (60 seconds)
- **Friendly error messages**: Soroban simulation errors translated to actionable messages
- **Deal ID extraction fallback**: Checks both `returnValue` and `resultMetaXdr.v3.sorobanMeta.returnValue`

## Components

### ConnectWallet

**File**: `src/components/ConnectWallet.tsx`

Wallet connection button displayed in the header when disconnected. Opens the unified connect modal with Privy as the primary path and extension wallets as fallback.

### StripeXlmOnrampCard

**File**: `src/components/StripeXlmOnrampCard.tsx`

Wallet Prep includes a Stripe hosted onramp card for native XLM wallet top-ups.
It sends the connected Stellar G-address to the backend, which creates the
Stripe session with `STRIPE_SECRET_KEY` and returns a hosted Link redirect URL.
This path works for Privy and extension-wallet users because the purchase
destination is the connected Stellar wallet. It does not fund escrow directly;
users still click **Fund Deal** after XLM arrives.

### SoroswapWidget

**File**: `src/components/SoroswapWidget.tsx`

Wallet support interface (Wallet Prep tab):

**Send XLM**: Browser-signed native XLM transfer from the connected Stellar wallet. Active destination accounts receive a standard payment; fresh destination addresses are activated with `createAccount` when the amount is at least 1 XLM. The utility uses the existing Privy/Stellar Wallets Kit signer and does not export private keys.

**Friendbot / testnet only**: One-click 10,000 XLM testnet funding with duplicate-funding detection. This card is hidden outside testnet.

**Convert on Stellar**: Quote -> Sign -> Convert through the configured AMM/broker route. Users select common XLM/USDC routes from dropdowns, can open advanced mode to paste pay/receive SAC contract addresses, flip direction, choose exact pay or exact receive, and set slippage presets/custom tolerance. On mainnet, the common XLM <-> Circle USDC route uses Stellar Horizon pathfinding / SDEX liquidity. The current testnet adapter executes against the seeded Soroswap router pool, so custom pairs require available route liquidity. This prepares the connected Stellar wallet only; escrow funding happens later from Deals via `fund_deal`.

**NEAR Intents wallet top-up**: Wallet Prep renders the reusable `NearIntentsPanel` as a general cross-chain wallet top-up utility where the user chooses source chain, source asset, source amount, and an approved Stellar destination. The first pending client milestone also opens the same panel in a focused deal-aware modal, where the deal and remaining pending balance are already selected and locked. The NEAR route is not the escrow funding transaction: it prepares the connected Stellar wallet, then the user confirms **Fund Deal** to call `fund_deal`. Source chain/token options come from public 1Click token discovery, while deal-tied destination assets remain limited to the backend-approved Stellar settlement allowlist. EVM routes use the browser's injected wallet connector; NEAR and Solana source-wallet connectors remain separately gated. Quote requests require a connected Stellar G-address so the settlement recipient is real before the server calls 1Click. The panel shows signature-verified quote state in product terms and explicitly warns that payment/top-up status does not mark escrow funded until the user confirms `fund_deal` and Stellar DealEscrow `funded` events exist.

### CreateDeal

**File**: `src/components/CreateDeal.tsx`

Three-step deal creation:

**Step 1 — Configuration**: Provider/Connector address inputs (real-time G-address validation), escrow settlement-asset selection, total amount, fee percentages, dynamic milestone editor (percentages must sum to 100%), live split preview. Create Deal does not run swaps; payment preparation happens from Wallet Prep or pending milestones.

**Step 2 — Review**: Full deal summary before signing. Transaction progress: Signing → Submitting → Confirming.

**Step 3 — Success**: Centered animated checkmark, Deal ID, transaction hash, Explorer link, "View Deal Dashboard" navigation.

**Quick Start scenarios**: Security Audit (500 XLM / 3 milestones), Dev Sprint (1,200 XLM / 2 milestones), Advisory Retainer (3,000 XLM / 4 milestones). Auto-fills demo testnet addresses.

### DealDashboard

**File**: `src/components/DealDashboard.tsx`

Split-panel deal lifecycle management:

**Left panel — Deal List**:
- Search bar with clear button (×), dynamic icon color, and result counter showing `N results for "query"`
- Segmented filter tabs (`All` / `In Progress` / `Awaiting Funding` / `Completed` / `Disputed` / `Resolved` / `Cancelled`) — pill-track container with color-coded active states and status dots
- Per-deal cards: title, status tag, total amount, milestone progress, role badge (Client/Provider/Connector)
- Auto-refresh every 30 seconds via ref-based interval

**Deal-level funding**: The Deals tab receives the connected wallet's XLM and configured settlement-token balances from `useUnifiedWallet`. The first pending client milestone acts as the checkout entry, shows the remaining pending deal amount, disables direct Stellar funding if the known balance is short, and leaves Wallet Prep / Top Up from Another Chain as the recovery paths. The direct Stellar action calls `fund_deal`, locking all pending milestones in one payment. Create Deal selects the escrow settlement asset; funding-time UI decides whether the user can fund directly or should prepare/swap/top up first.

**Right panel — Deal Detail**:
- Empty state: centered Activity icon + "Select a Deal" prompt (uses inner flex wrapper to bypass Card's internal wrapper)
- Deal header: status badge, escrow protection indicator, title, Deal ID copy, participant addresses with "YOU" badge, fee breakdown
- Milestone timeline: numbered nodes, color-coded status, context-aware action buttons
- The first pending client milestone exposes **Top Up from Another Chain**, opening the reusable NEAR Intents top-up panel with the selected deal and remaining pending balance locked
- 3-Way Split Visualization: animated bar chart after release, exact amounts + percentages per party
- Vault Analytics sidebar: Unlocked / Secured / Pending amounts
- Event Ledger sidebar: chronological milestone events with transaction trace links

**Confirmation modals**:
- Release: shows exact 3-way split before execution
- Dispute: freeze warning and required off-chain reason note for admin review
- Admin resolution: handled in protected `/admin` through indexed dispute evidence, dispute notes, generated `resolve_dispute` commands, and optional server-side execution when admin signer envs are explicitly enabled
- All modals: ESC dismiss, backdrop click dismiss, scroll lock

### ReputationBadge

**File**: `src/components/ReputationBadge.tsx`

On-chain reputation lookup with radar animation and animated count-up display. Badge tiers: New Provider (0) → Verified (1+) → Trusted (5+) → Elite (10+).

## Library Modules

### `nearIntents.ts`

**File**: `src/lib/nearIntents.ts`

Small browser client for the local NEAR Intents adapter:

- `readiness()` calls the public backend readiness endpoint.
- `createQuote(bindingId, body)` calls the protected quote endpoint.
- `getStatus(bindingId)` calls the protected status endpoint.
- Errors are wrapped as `NearIntentsApiError` so the UI can distinguish admin
  auth, disabled feature flags, validation errors, and provider failures.

### stellar.ts

Core Stellar SDK configuration and utilities:

| Export | Description |
|--------|-------------|
| `STELLAR_NETWORK` | From `VITE_STELLAR_NETWORK`; defaults to `testnet` |
| `SOROBAN_RPC_URL` | From `VITE_STELLAR_RPC_URL`; defaults to Stellar public testnet RPC in testnet mode |
| `HORIZON_URL` | From `VITE_STELLAR_HORIZON_URL`; defaults to Stellar public testnet Horizon in testnet mode |
| `EXPLORER_URL` | From `VITE_STELLAR_EXPLORER_URL`; defaults to Stellar Expert testnet/public URL by network |
| `FRIENDBOT_URL` | Testnet-only; empty outside testnet |
| `XLM_SAC_ADDRESS` | Native XLM as Stellar Asset Contract, derived by network unless `VITE_XLM_SAC_ADDRESS` overrides it |
| `DEAL_ESCROW_CONTRACT` | From `VITE_DEAL_ESCROW_CONTRACT` |
| `DEMO_ACCOUNTS` | Pre-generated provider/connector testnet addresses |
| `MAINNET_PILOT_ACCOUNTS` | Public mainnet preset provider/connector addresses from `VITE_MAINNET_DEMO_PROVIDER_ADDRESS` / `VITE_MAINNET_DEMO_CONNECTOR_ADDRESS`, with pilot ops-wallet fallback |
| `sorobanServer` | Soroban RPC Server instance |
| `horizonServer` | Horizon Server instance |
| `formatAmount()` | 7-decimal to human-readable |
| `toContractAmount()` | Human-readable to 7-decimal BigInt |
| `isValidStellarAddress()` | G-address regex validation |
| `truncateAddress()` | `GABCD...WXYZ` display format |

### stellarBroker.ts and soroswapOnchain.ts

`stellarBroker.ts` exposes the broker-facing `StellarBrokerProvider` interface
used by `SoroswapWidget` and the create-deal swap step:

```ts
getQuote(assetIn, assetOut, amount, tradeType, sourceAddress)
buildTransaction(quote, fromAddress)
sendTransaction(signedXdr)
```

Quotes carry provider metadata:

- `providerId`
- `quoteExpiresAt`
- `slippageBps`

In the current testnet demo the provider delegates to `soroswapOnchain.ts`,
which calls the seeded Soroswap router path directly because public indexed
testnet liquidity may be unavailable after resets.

### soroswap.ts

Optional public aggregator quote client used by `SoroswapWidget` as an informational route-discovery check. It calls the local backend proxy at `/api/soroswap/quote`; the Soroswap API key stays server-side in `SOROSWAP_API_KEY`. It is not the executable swap path for the current demo.

### dealMetadata.ts

Local (localStorage) milestone naming and event log. Stores custom milestone names and records funded/released/disputed events per deal for the Event Ledger sidebar.

## UX Patterns

### Toast Notification System

React Context-based global toasts. Three types: `success`, `error`, `info`. Auto-dismiss after 3s, click to dismiss. Max 3 concurrent. Accessible via `aria-live="polite"`.

### Transaction Progress

```text
[Signing] → [Submitting] → [Confirming]
```

Step indicator during the ~5-10 second confirmation window.

### Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `Alt+1` | Wallet Prep tab |
| `Alt+2` | Create Deal tab |
| `Alt+3` | Deals tab |
| `Alt+4` | Oracle tab |
| `Escape` | Close confirmation modals |

Only active when wallet is connected.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_DEAL_ESCROW_CONTRACT` | Yes | Deployed DealEscrow contract address |
| `VITE_STELLAR_NETWORK` | No | `testnet` or `mainnet`; defaults to `testnet` |
| `VITE_STELLAR_RPC_URL` | No | Soroban RPC URL for the selected network |
| `VITE_STELLAR_HORIZON_URL` | No | Horizon URL for balance/account reads |
| `VITE_STELLAR_EXPLORER_URL` | No | Explorer base URL for tx/contract/account links |
| `VITE_FRIENDBOT_URL` | No | Testnet-only Friendbot URL; ignored outside testnet |
| `VITE_USDC_TOKEN_ADDRESS` | No | Optional USDC-compatible SAC override; defaults to demo USDC on testnet and Circle USDC on mainnet |
| `VITE_SETTLEMENT_TOKEN_SYMBOL` | No | Display symbol for configured settlement asset |
| `VITE_SETTLEMENT_TOKEN_NAME` | No | Display name for configured settlement asset |
| `VITE_SETTLEMENT_TOKEN_DECIMALS` | No | Settlement precision; defaults to `7` |
| `VITE_SETTLEMENT_MIN_UNITS` | No | Minimum whole-unit deal amount enforced by the create flow; defaults to `1` |
| `VITE_SETTLEMENT_ASSET_POLICY` | No | Policy label shown in create flow, e.g. `demo-testnet` or `approved-mainnet` |
| `VITE_STELLAR_BROKER_PROVIDER` | No | Broker provider id shown in the UI; defaults to `testnet-soroswap-seeded` on testnet |
| `VITE_STELLAR_BROKER_SLIPPAGE_BPS` | No | Swap slippage tolerance in basis points; defaults to `100` |
| `VITE_STELLAR_BROKER_QUOTE_TTL_SECONDS` | No | Quote/deadline window; defaults to `3600` |
| `VITE_SOROSWAP_ROUTER_ADDRESS` | No | Soroswap router used by the Stellar Broker testnet adapter |
| `VITE_STRIPE_ONRAMP_ENABLED` | No | Enables the Stripe hosted XLM onramp card; defaults to `true` |
| `VITE_STRIPE_ONRAMP_MODE` | No | Display mode for the Stripe card, usually `test` or `production` |
| `VITE_STRIPE_ONRAMP_SOURCE_CURRENCY` | No | Fiat currency default sent to the backend; defaults to `usd` |
| `VITE_STRIPE_ONRAMP_DEFAULT_AMOUNT` | No | Fiat amount default for the hosted onramp session; defaults to `10` |
| `VITE_STRIPE_ONRAMP_DESTINATION_CURRENCY` | No | Display destination currency; defaults to `xlm` |
| `VITE_STRIPE_ONRAMP_DESTINATION_NETWORK` | No | Display destination network; defaults to `stellar` |

The public aggregator API key belongs on the backend as `SOROSWAP_API_KEY`,
not as a `VITE_` variable. Stripe hosted onramp sessions are also created by
the backend; keep `STRIPE_SECRET_KEY` out of frontend env.

When `VITE_STELLAR_NETWORK=mainnet`, Friendbot UI is hidden and seeded
testnet pool language is replaced with generic provider/broker copy. The
current executable broker adapter is still the seeded Soroswap route until the
Gap 4 provider interface is completed.

Settlement asset policy is documented in
[`SETTLEMENT_ASSET_POLICY.md`](SETTLEMENT_ASSET_POLICY.md).

## Build and Development

```bash
cd frontend
npm install
npm run dev      # Development server on :5173
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.x | UI framework |
| `@stellar/stellar-sdk` | 14.6.1 | Stellar/Soroban interaction |
| `@creit.tech/stellar-wallets-kit` | 2.0.1 | Multi-wallet connection |
| `lucide-react` | 0.577+ | Icon library |
| `tailwindcss` | 4.2.x | Utility-first CSS (v4) |
| `typescript` | 5.9 | Type safety |
| `vite` | 8.0 | Build tool |
