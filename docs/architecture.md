# PACT SDK Architecture

## 1) Role in the Ecosystem

```text
Apps / Humans / Agents
          |
         sdk
          |
       core protocol runtime
```

SDK is the execution bridge between participant runtimes and protocol invariants.

## 2) Architecture Priorities

1. runtime-first loops before endpoint breadth
2. typed contracts for mission/event/evidence/economics
3. deterministic recovery via cursor + checkpoint semantics
4. policy-aware claim/submit behavior
5. composition of multi-asset compensation intents

## 3) Module Layout

- `client` (implemented): HTTP transport primitives
- `worker-runtime` (implemented): runOnce/runLoop orchestration
- `event-sources` (implemented): HTTP and in-memory event feed adapters
- `economics` (implemented): compensation model builders and summarizers
- `types` (implemented): shared runtime contracts
- `mission` (planned): local mission graph cache
- `policy` (planned): reusable risk/permission policy packs
- `evidence` (planned): canonical evidence serialization helpers

## 4) Runtime Loop Model

```text
poll events -> claim mission -> execute -> build evidence -> submit -> checkpoint -> repeat
```

## 5) Failure Semantics

Worker runtime separates outcomes:

- `submitted`
- `skipped` (no mission / policy denied)
- `failed` (execution/runtime errors)

This supports deterministic operations and governance metrics.

## 6) Compatibility Direction

SDK major versions should follow protocol major compatibility.
Compatibility matrix is maintained in this repo and in `pactcore/meta`.
