# SDK Route Parity Audit

This audit captures the `@pactcore/sdk` transport surface as of March 12, 2026.

## Sources Reviewed

- implemented core routes: `../pact-network-core-bun/src/api/app.ts`
- whitepaper baseline: `../pact-whitepaper-docs/app/page.mdx`

## Summary

- `PactSdk` exposes `172` public async methods.
- `171` of those methods directly call HTTP routes.
- `167` implemented `core` routes have direct SDK client coverage.
- `1` method is a composed helper:
  - `querySettlementReconciliationRecords()` delegates to `querySettlementAuditRecords()` with a default `reconciled` status filter.
- `4` direct transport methods are forward-compatible SDK additions that do not yet have matching routes in the audited `core` app:
  - `getAntiSpamStake()`
  - `trackOnchainTransaction()`
  - `recordOnchainTransactionInclusion()`
  - `recordCanonicalBlock()`

## Core Route Family Coverage

| Family | Implemented core routes | SDK status |
|---|---:|---|
| health | 1 | covered |
| observability + admin | 16 | covered |
| identity + security + ZK | 39 | covered |
| tasks + missions | 14 | covered |
| payments + economics + governance | 44 | covered |
| platform extensions (`compute`, `heartbeat`, `data`, `dev`, `disputes`) | 53 | covered |

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

Some whitepaper concepts are represented in the current implementation without standalone SDK transport methods:

- auction design from `8.3` is currently reflected through task pricing inputs, payment/economic analytics, and matching logic in `core`, not a dedicated auction route
- multidimensional matching from `8.4` is expressed through task constraints, role/capability checks, reputation filters, and compute/data selection flows rather than a single matching endpoint
- multi-layer verification from `6.3` and `8.1` is distributed across mission verdicts, disputes, reputation, anti-spam, security, and ZK proof routes

## Outcome

For implemented `core` HTTP routes, SDK parity is complete in this repo.

The remaining parity work is not missing client coverage for existing audited routes; it is ongoing maintenance:

- keep this document in sync when `core` adds routes
- convert forward-compatible SDK-only methods to full parity once matching `core` routes ship
- update the whitepaper traceability notes when new route families land
