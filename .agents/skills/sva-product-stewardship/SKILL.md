---
name: sva-product-stewardship
description: Use when working on product, schema, UI, data product strategy, API readiness, QA docs, or any code change that affects product behavior in this repository. Requires reading repo docs first, checking demo/legacy state, logging behavior changes with timestamps, reusing components, and avoiding unnecessary architecture.
---

# SVA Product Stewardship

## Required Intake

Before changing behavior, read the current repository context:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/SMART_CONTRACT.md`
- `docs/FRONTEND.md`
- `docs/EVENT_SCHEMA.md` when touching events, indexing, dashboards, or data sync
- `docs/DEMO_GUIDE.md` when changing user flows or QA steps
- Relevant package READMEs such as `frontend/README.md`, `indexer/README.md`, or `scripts/README.md`

Search for `legacy`, `demo`, `testnet`, `TODO`, `FIXME`, `mock`, `stub`, `placeholder`, `out of scope`, `Tranche`, and affected feature names before editing. Treat existing untracked or modified files as user work unless proven otherwise.

## Working Rules

Clarify what is expected before implementation:

- Identify whether the change is product behavior, schema/data, API readiness, UI/UX, QA/docs, or operational readiness.
- State what exists today, what is legacy/demo-only, what is expected to change, and what must remain unchanged.
- Prefer the existing architecture and local helpers over new abstractions.
- Use existing reusable components from `frontend/src/components/ui/` and established hooks/libs before creating new UI or transaction logic.
- Create a new component or helper only when it removes real duplication or clearly matches an existing pattern.
- Avoid overengineering: choose the smallest durable change that satisfies the product requirement and preserves reviewability.

## Behavior Log

For product behavior, schema, API, UI flow, or QA documentation changes, add a timestamped log entry in the relevant doc or change note. Include:

- Timestamp with timezone.
- Feature or workflow name.
- What changed.
- Why it changed.
- Validation performed or still required.

Use concise entries. Do not create a separate changelog unless the user asks for one or a scoped audit/change log already exists.

## Submission README Updates

For every change relevant to an SCF/grant/reviewer submission, update the README surface that reviewers are likely to read:

- Update root `README.md` when the change affects shipped scope, reviewer links, setup, demo flow, architecture, deliverables, positioning, or validation evidence.
- Update relevant package READMEs such as `frontend/README.md`, `indexer/README.md`, or `scripts/README.md` when the change affects that package's setup, commands, env vars, routes, UI tabs, or operational behavior.
- Keep README claims aligned with source code and detailed docs. Do not overstate demo/testnet behavior as production/mainnet readiness.
- If a submission-relevant change does not require a README update, state why in the final response.

## Review Checklist

Before finishing:

- Confirm docs and implementation still agree.
- Confirm submission-relevant changes are reflected in root `README.md` and any relevant package README, or explain why no README update was needed.
- Check that demo/testnet claims are not overstated as production/mainnet behavior.
- Confirm any schema/event/API change has an indexing or consumer-readiness note.
- Run the smallest relevant validation available: contract tests for Soroban changes, frontend type/build/lint for UI changes, indexer build or smoke command for indexer changes, and docs checks where present.
- Report skipped validation and the reason.
