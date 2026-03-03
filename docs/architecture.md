# PACT SDK Architecture

## 1) Role in the Ecosystem

```text
Apps / Agents / Services
          |
         sdk
          |
       core protocol runtime
```

SDK is the execution bridge between agent applications and protocol invariants.

## 2) Architecture Priorities

1. **Runtime-first**: autonomous loops before endpoint breadth
2. **Typed contracts**: stable TypeScript models and interfaces
3. **Composable transports**: HTTP now, stream/queue/MCP next
4. **Deterministic recovery**: cursor + checkpoint semantics
5. **Policy-aware execution**: capability gating at runtime edges

## 3) Module Layout

- `client` (implemented): transport primitives and endpoint methods
- `worker-runtime` (implemented): runOnce/runLoop orchestration
- `types` (implemented): mission/runtime/event/checkpoint contracts
- `events` (implemented): `HttpMissionEventFeed` and `InMemoryMissionEventFeed`
- `mission` (planned): local mission graph and conflict helpers
- `policy` (planned): reusable policy packs and evaluators
- `evidence` (planned): canonical evidence and hash utilities

## 4) Runtime Loop Model

```text
poll events -> claim mission -> execute -> build evidence -> submit -> checkpoint -> repeat
```

## 5) Failure Semantics

Worker runtime separates outcomes:

- `submitted`
- `skipped` (no mission or policy denial)
- `failed` (execution/runtime errors)

This enables deterministic operator metrics and retry control.

## 6) Compatibility Direction

SDK major versions should follow protocol major compatibility.
A compatibility matrix is maintained in docs and in `pactcore/meta`.
