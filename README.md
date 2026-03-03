# PACT SDK

PACT SDK is the developer integration layer for the PACT ecosystem.
It provides a typed TypeScript client for interacting with `core` services.

## Why a Separate SDK Repository?

PACT uses a two-repo strategy:

- **`core`**: protocol execution engine and domain invariants
- **`sdk`** (this repo): developer ergonomics, typed clients, integration helpers

This allows core protocol logic to remain stable while SDK experience evolves quickly.

## Vision

PACT is not only a task protocol.
It is an AI-native coordination fabric where issuers, workers, validators, and apps can collaborate through programmable trust.

The SDK is the gateway for:

- Agent applications
- Wallet-integrated marketplaces
- Automation backends
- Data and compute workflows

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

const health = await sdk.health();
const task = await sdk.createTask({
  id: "task-001",
  issuerId: "issuer-1",
  description: "Verify geotagged asset",
  paymentCents: 5000,
});
```

## API Surface

- `health()`
- `registerParticipant()`
- `listWorkers()`
- `createTask()`
- `assignTask()`
- `submitTask()`
- `listTasks()`
- `getTask()`
- `getLedger()`

## Local Development

```bash
bun install
bun test
bun run typecheck
```

## Roadmap

- OpenAPI-generated typed models
- Retry/backoff and circuit-breaker policies
- Event subscription client (SSE/WebSocket)
- Wallet signer adapters
- Framework integrations (Next.js, NestJS, Cloudflare Workers)
