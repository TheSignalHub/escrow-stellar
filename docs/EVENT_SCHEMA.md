# DealEscrow Event Schema

> Reference for the off-chain indexer (SCF #42 — Deliverable 5).
>
> Source of truth: `stellar-demo/contracts/deal_escrow/src/lib.rs`
> Indexer implementation: `the-signal/src/lib/inngest/functions/sorobanEventListener.ts`

The DealEscrow Soroban contract emits seven event topics over the course of a deal's lifecycle. Each event carries:

- A **topic vector** (the first ScSymbol identifies the event type, followed by indexed parameters like `deal_id` and `milestone_idx`)
- A **value** (the non-indexed payload, often a tuple)

All numeric encodings follow Stellar's stroop precision: integer amounts at 7 decimals (`10000000` stroops = 1 USDC).

---

## Events

### 1. `created` — Deal initialized

Emitted at the end of `create_deal`. The deal is in `Created` state with no funded milestones yet.

| Field | XDR type | Notes |
|---|---|---|
| topic[0] | ScSymbol `"created"` | event discriminator |
| topic[1] | ScU64 `deal_id` | autoincrement contract-side deal ID |
| value | ScI128 `total_amount` | sum of all milestone amounts (stroops) |

```rust
env.events().publish((symbol_short!("created"), deal_id), deal.total_amount);
```

### 2. `funded` — Milestone deposited

Emitted by `deposit`. The client has transferred `amount` to the contract via the Stellar Asset Contract.

| Field | XDR type | Notes |
|---|---|---|
| topic[0] | ScSymbol `"funded"` | |
| topic[1] | ScU64 `deal_id` | |
| topic[2] | ScU32 `milestone_idx` | 0-based index of the milestone |
| value | ScI128 `amount` | amount funded in stroops |

```rust
env.events().publish((symbol_short!("funded"), deal_id, milestone_idx), milestone.amount);
```

### 3. `released` — Milestone released (atomic 3-way split)

Emitted by `release_milestone`. The contract has executed three atomic SAC transfers in a single transaction.

| Field | XDR type | Notes |
|---|---|---|
| topic[0] | ScSymbol `"released"` | |
| topic[1] | ScU64 `deal_id` | |
| topic[2] | ScU32 `milestone_idx` | |
| value | ScVec [ScI128, ScI128, ScI128] | `(provider_cut, connector_cut, protocol_cut)` |

```rust
env.events().publish(
    (symbol_short!("released"), deal_id, milestone_idx),
    (provider_cut, connector_cut, protocol_cut),
);
```

### 4. `done` — Deal fully completed

Emitted by `release_milestone` when the FINAL milestone is released. Increments the on-chain reputation counter for the provider.

| Field | XDR type | Notes |
|---|---|---|
| topic[0] | ScSymbol `"done"` | |
| topic[1] | ScU64 `deal_id` | |
| value | ScU64 `reputation_count` | new lifetime completed-deal counter for provider |

```rust
env.events().publish((symbol_short!("done"), deal_id), current + 1);
```

### 5. `dispute` — Milestone frozen by either party

Emitted by `dispute`. Caller is either the client or the provider on this deal.

| Field | XDR type | Notes |
|---|---|---|
| topic[0] | ScSymbol `"dispute"` | |
| topic[1] | ScU64 `deal_id` | |
| topic[2] | ScU32 `milestone_idx` | |
| value | ScAddress `caller` | G… or C… address — the party who disputed |

```rust
env.events().publish((symbol_short!("dispute"), deal_id, milestone_idx), caller);
```

### 6. `resolved` — Admin split of disputed funds

Emitted by `resolve_dispute`. Admin has split the locked milestone amount between client and provider.

| Field | XDR type | Notes |
|---|---|---|
| topic[0] | ScSymbol `"resolved"` | |
| topic[1] | ScU64 `deal_id` | |
| topic[2] | ScU32 `milestone_idx` | |
| value | ScVec [ScI128, ScI128] | `(client_refund, provider_amount)` |

```rust
env.events().publish(
    (symbol_short!("resolved"), deal_id, milestone_idx),
    (client_refund, provider_amount),
);
```

### 7. `refund` — Full refund

Emitted by `refund`. Admin has refunded **all** funded/disputed milestones back to the client and cancelled the deal.

| Field | XDR type | Notes |
|---|---|---|
| topic[0] | ScSymbol `"refund"` | |
| topic[1] | ScU64 `deal_id` | |
| value | ScI128 `total_refunded` | sum returned to client in stroops |

```rust
env.events().publish((symbol_short!("refund"), deal_id), refunded);
```

---

## Indexer state machine

```
                                          ┌─ release ──→  funded → released → done?
created → funded ── deposit──→ funded ────┤
                                          └─ dispute ──→  funded → disputed ──┐
                                                                              │
                                                                  resolved ←──┘
                                                                  refund ←── (any time on any funded/disputed milestone)
```

Each event maps 1:1 to an `escrow-transfers` row in The Signal Payload CMS, with `chain = "stellar"` and the topic stored in `sorobanEventTopic`.

## Payload row mapping

| Field on `escrow-transfers` | Source |
|---|---|
| `chain` | always `"stellar"` for these events |
| `sorobanContractAddress` | contract being indexed (from `stellar-indexer-state` global) |
| `sorobanDealId` | `deal_id` (u64 → number, safe within JS precision for foreseeable use) |
| `sorobanMilestoneIdx` | `milestone_idx` if topic carries it |
| `sorobanEventTopic` | the topic string |
| `sorobanEventId` | RPC-side unique event ID `<ledger>-<seq>` — primary dedupe key |
| `sorobanLedgerSeq` | ledger sequence |
| `sorobanEventData` | full parsed event payload (JSON, source of truth for i128 precision) |
| `onchainTxHash` | tx hash containing the event |
| `amount` | per-topic most meaningful amount, converted from stroops to whole units |
| `platformCommission` | for `released`: `connectorCut + protocolCut` in whole units; otherwise 0 |

---

## Decoding cheatsheet

The indexer uses `@stellar/stellar-base`'s `scValToNative()` to convert each `ScVal` to a JS native:

| Soroban type | JS value after `scValToNative` |
|---|---|
| `ScSymbol` | `string` |
| `ScU32` | `number` |
| `ScU64` | `bigint` |
| `ScI128` | `bigint` |
| `ScAddress` (G… or C…) | `string` |
| `ScVec` | recursively decoded `Array` |

Since `bigint` doesn't serialize cleanly through MongoDB/Payload, the indexer converts to **decimal strings** for u64 / i128 (preserves full precision) and **JS number** for u32 (always safe).

---

## Retention window (testnet)

Soroban Testnet RPC retains events for **~7 days** (currently ledger range `currentLedger - 120000` to `currentLedger`). If the indexer is paused or redeployed for longer than that, events outside the window cannot be recovered from the RPC — they must be replayed by walking transactions from Horizon's `/operations` endpoint (out of scope for D5).

For continuous indexing, run the cron at least every minute (default in `sorobanEventListener.ts`) — the `overlapLedgers = 5` parameter gives a 25-second safety margin against transient RPC drift.
