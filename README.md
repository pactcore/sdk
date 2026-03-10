# PACT SDK

PACT SDK is the runtime toolkit for building on top of `pactcore/core`.

This package is designed for **human-agent protocol participation**, not only endpoint calls.

## Design Baseline

- protocol semantics come from the PACT whitepaper (`core`)
- SDK focuses on loop execution, recovery, policy enforcement, and economic composition
- transport helpers are supporting pieces, not the center

## Current Capabilities

- typed `PactSdk` transport client
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
```

## Documentation

- `docs/architecture.md`
- `docs/agent-sdk-direction.md`
- `docs/runtime-composition.md`
- `docs/compatibility.md`
- `docs/economics.md`
