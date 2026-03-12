# Compatibility Matrix

## Protocol Compatibility

| SDK Version | Core Baseline | Notes |
|---|---|---|
| `0.1.x` | mission runtime + mailbox + event journal + challenge/retry | initial public baseline |
| `0.2.x` | audited `PactSdk` parity with the current `pact-network-core-bun` HTTP surface + runtime/economics helpers | current baseline |

## March 12, 2026 Audit Snapshot

- `PactSdk` exposes `172` public async methods.
- `171` methods directly back HTTP requests.
- `167` implemented `core` routes are covered by direct SDK methods.
- `querySettlementReconciliationRecords()` is a composite helper built on `querySettlementAuditRecords()`.
- `getAntiSpamStake()`, `trackOnchainTransaction()`, `recordOnchainTransactionInclusion()`, and `recordCanonicalBlock()` remain forward-compatible SDK transport methods until matching `core` routes exist.

## Contract Stability Notes

- `WorkerRuntime` loop/checkpoint APIs are available and stable in `0.2.x`.
- Event feed interfaces support cursor polling semantics in `0.2.x`.
- Transport coverage now spans observability/admin, identity/security/ZK, tasks/missions, payments/economics/governance, and platform extension modules.
- Mission, dispute, economics, compute, data, and managed-backend schemas may expand additively in minor releases.

## Upgrade Guidance

1. pin SDK minor version in production agents
2. validate runtime loops against target `core` release tags
3. verify route parity notes in `docs/route-parity-audit.md` when adopting newly added `core` modules
4. confirm whether forward-compatible SDK-only methods have matching `core` support before relying on them in production
5. monitor `pactcore/meta` for terminology/runtime spec updates
