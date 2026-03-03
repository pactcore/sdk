# PACT SDK

PACT SDK is the agent-builder toolkit for the PACT ecosystem.
It currently includes a typed TypeScript client and is evolving toward a full runtime kit for autonomous workers and validators.

## Repository Role

PACT uses a three-repo model:

- **`core`**: protocol execution engine and invariant system
- **`sdk`** (this repo): developer and agent runtime tooling
- **`meta`**: standards, roadmap, and cross-repo governance

## Product Direction (Agent-First)

The SDK focus is not "more endpoints".
The focus is enabling reliable autonomous loops:

- mission claim and execution
- evidence packaging and submission
- event replay and checkpointing
- policy-aware tool usage
- resilient retries with deterministic state

## Current Capabilities

- typed `PactSdk` client
- participant/task/ledger transport helpers
- pluggable `fetch` transport
- baseline tests and type-safe contracts

## Planned SDK Surfaces

- `mission` module for lifecycle helpers
- `events` module for subscriptions and replay
- `policy` module for capability gating
- `evidence` module for canonical payload construction
- `agent` runtime helpers for worker/validator roles

See `docs/agent-sdk-direction.md` for detailed design direction.

## Install

```bash
bun add @pact/sdk
# or
npm i @pact/sdk
```

## Quick Start

```ts
import { PactSdk } from "@pact/sdk";

const sdk = new PactSdk({ baseUrl: "https://api.pact.network" });

await sdk.health();
await sdk.createTask({
  id: "task-001",
  issuerId: "issuer-1",
  description: "Verify geotagged asset",
  paymentCents: 5000,
});
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
