# PACT SDK

PACT SDK is the agent runtime toolkit for building on top of `pactcore/core`.

This package is intentionally moving from "API wrapper" to **mission runtime framework**:

- mission lifecycle helpers
- event cursor processing
- checkpoint persistence
- policy-aware execution loops

## Design Baseline

- protocol truth comes from the PACT whitepaper (`core`)
- runtime ergonomics draw from practical autonomous-agent loop patterns
- architecture direction aligns with a Web4-style agent economy (agents as operators)

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
- policy middleware for claim/submit actions

## Planned Surfaces

- `mission` module (local mission state cache)
- `events` module (stream adapters: SSE/queue/MCP)
- `policy` module (composable guardrail packs)
- `evidence` module (canonical evidence builders + hashing)
- `validator` runtime helpers

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
} from "@pactcore/sdk";

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
