# SDK Route Parity Audit

This audit captures the `@pactcore/sdk` transport surface as of March 13, 2026.

This file is generated from `scripts/route-parity-audit.mjs`.

## Sources Reviewed

- SDK client surface: `src/client.ts`
- implemented core routes: `../pact-network-core-bun/src/api/app.ts`
- whitepaper baseline: `../pact-whitepaper-docs/app/whitepaper/**/*.mdx`
- authored SDK tests scanned for surface coverage: `tests/**/*.test.ts`

## Summary

- `PactSdk` exposes `172` public async methods.
- `171` of those methods directly call HTTP routes.
- `167` implemented `core` routes are audited.
- Missing SDK coverage for implemented `core` routes: `0`.
- Composite helpers: `querySettlementReconciliationRecords()`.
- Forward-compatible SDK-only direct methods without matching audited `core` routes: `getAntiSpamStake()`, `recordCanonicalBlock()`, `recordOnchainTransactionInclusion()`, `trackOnchainTransaction()`.
- Authored TypeScript tests cover `172` / `172` public methods and `171` / `171` direct HTTP methods.

## Core Route Family Coverage

| Family | Implemented core routes | SDK status |
|---|---:|---|
| health | 1 | covered |
| observability + admin | 16 | covered |
| identity + security + ZK | 39 | covered |
| tasks + missions | 14 | covered |
| payments + economics + governance | 44 | covered |
| platform extensions (`compute`, `heartbeat`, `data`, `dev`, `disputes`) | 53 | covered |

## SDK Surface Test Coverage

- Authored TypeScript test files scanned: `18`.
- Untested public methods: `0`.
- Untested direct HTTP methods: `0`.
- Every public `PactSdk` method is referenced by at least one authored TypeScript test.

## Implemented Core Route Gaps

None. Every audited implemented `core` route currently has direct `PactSdk` coverage.

## Forward-Compatible SDK-Only Direct Methods

| SDK method | Route | Note |
|---|---|---|
| `getAntiSpamStake()` | `GET /anti-spam/${encodeURIComponent(participantId)}/stake/${encodeURIComponent(action)}` | no matching audited core route yet |
| `recordCanonicalBlock()` | `POST /onchain/finality/blocks/canonical` | no matching audited core route yet |
| `recordOnchainTransactionInclusion()` | `POST /onchain/finality/transactions/${encodeURIComponent(txId)}/inclusion` | no matching audited core route yet |
| `trackOnchainTransaction()` | `POST /onchain/finality/transactions` | no matching audited core route yet |

## Whitepaper Traceability

The current SDK transport surface maps well to the whitepaper's route-relevant capability areas:

| Whitepaper area | Current SDK coverage |
|---|---|
| `4. Ecosystem Architecture` | observability, analytics, ecosystem status/modules/synergy |
| `5.1 PactTasks` | task creation, assignment, submission, mission lifecycle, challenge resolution |
| `5.2 PactPay` | payment routing, X402 relay, micropayments, credit lines, gas sponsorship, ledger, settlement execution |
| `5.3 PactID` | participant registration, DID documents, credentials, capability checks, participant levels/stats |
| `5.4 PactData` | data assets, lineage/dependents, access policy, marketplace listing/purchase/stats |
| `5.5 PactCompute` | provider registry/search, pricing, jobs, usage, adapter/backend health |
| `5.6 PactDev` | plugin publishing/install/revenue, integrations, policies, templates, managed backend health |
| `6. Participant Roles` | role capability/requirements checks, participant matrix category, reputation and anti-sybil/security surfaces |
| `6.4 Reputation System` | leaderboard, profile, history, event recording |
| `7. Zero-Knowledge Proof System` | proof creation, verification, receipts, manifests, circuit metadata, formal verification |
| `8. Verification + Dispute Design` | disputes, mission verdict/challenge flows, anti-spam, security analytics, settlement audit/replay helpers |

## Whitepaper Notes Without Dedicated Client Routes

- auction design from `8.3` is currently reflected through task pricing inputs, payment/economic analytics, and matching logic in `core`, not a dedicated auction route
- multidimensional matching from `8.4` is expressed through task constraints, role/capability checks, reputation filters, and compute/data selection flows rather than a single matching endpoint
- multi-layer verification from `6.3` and `8.1` is distributed across mission verdicts, disputes, reputation, anti-spam, security, and ZK proof routes

## Outcome

For implemented `core` HTTP routes, SDK parity is complete in this repo.

The remaining parity work is ongoing maintenance:

- keep this generated audit in sync when `core` adds routes
- keep authored TypeScript coverage at full public-surface parity as new SDK methods land
- convert forward-compatible SDK-only methods to full parity once matching `core` routes ship
- update the whitepaper traceability table when new route families land
