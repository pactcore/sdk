# PACT SDK

PACT SDK is the runtime toolkit for building on top of `pactcore/core`.

This package is designed for **human-agent protocol participation**, not only endpoint calls.

## Design Baseline

- protocol semantics come from the PACT whitepaper (`core`)
- SDK focuses on loop execution, recovery, policy enforcement, and economic composition
- transport helpers are supporting pieces, not the center

## Current Capabilities

- typed `PactSdk` transport client
- audited `PactSdk` route parity with the current `pact-network-core-bun` HTTP surface across:
  - observability + admin
  - identity + reputation + roles + anti-spam + security + ZK
  - tasks + missions + disputes
  - payments + economics + governance + rewards + onchain finality
  - compute + heartbeat + data + dev platform modules
- `WorkerRuntime` with:
  - `runOnce()`
  - `runLoop()`
  - event feed polling (cursor-based)
  - checkpoint persistence hooks
- event source adapters:
  - `HttpMissionEventFeed`
  - `InMemoryMissionEventFeed`
- in-memory checkpoint store:
  - `InMemoryWorkerRuntimeCheckpointStore`
- economics helpers:
  - `buildCompensationModel`
  - `summarizeCompensationByAsset`
  - `quoteCompensationInReference`
  - `buildSettlementPlan`
  - idempotent settlement execution helpers
  - settlement audit + lifecycle replay query builders
  - paginated reconciliation queue client methods
- onchain governance + rewards lifecycle client methods
- compute, data marketplace, plugin marketplace, dispute, and managed-backend client methods

## Route Parity Snapshot

- audited on March 13, 2026 against local `core` and whitepaper sources
- `PactSdk` currently exposes:
  - 172 public async methods
  - 171 direct HTTP-backed methods
  - 167 implemented `core` routes covered end-to-end
  - 1 composite helper: `querySettlementReconciliationRecords()`
  - 4 forward-compatible SDK-only transport methods pending matching `core` route support
  - authored TypeScript tests reference all 172 public methods

See `docs/route-parity-audit.md` for the full matrix and whitepaper traceability notes.

## Economic Model Support

Compensation composition supports mixed reward legs such as:

- USDC / stablecoins
- LLM token allowances
- cloud credits
- API quota credits

## Install

```bash
bun add @pactcore/sdk
# or
npm i @pactcore/sdk
```

## Quick Example

```ts
import {
  createWorkerRuntime,
  allowAllWorkerRuntimePolicy,
  buildCompensationModel,
} from "@pactcore/sdk";

const compensation = buildCompensationModel({
  legs: [
    {
      payerId: "issuer-1",
      payeeId: "agent-1",
      assetId: "usdc-mainnet",
      amount: 15,
      unit: "USDC",
    },
  ],
});

const runtime = createWorkerRuntime({
  agentId: "agent-1",
  missionSource,
  policy: allowAllWorkerRuntimePolicy(),
  handlers,
});

await runtime.runLoop({ iterations: 10 });
```

## Local Development

```bash
bun install
bun test
bun run typecheck
bun run audit:routes
```

## Documentation

- `docs/architecture.md`
- `docs/agent-sdk-direction.md`
- `docs/runtime-composition.md`
- `docs/compatibility.md`
- `docs/economics.md`
- `docs/route-parity-audit.md`
