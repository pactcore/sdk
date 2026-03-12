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

1. runtime-first loops for autonomous agents
2. typed transport parity with implemented `core` routes
3. deterministic recovery via cursor + checkpoint semantics
4. policy-aware claim/submit behavior
5. composition of multi-asset compensation intents

## 3) Module Layout

- `client` (implemented): audited HTTP transport coverage for the current `core` app surface
- `worker-runtime` (implemented): `runOnce()` / `runLoop()` orchestration
- `event-sources` (implemented): HTTP and in-memory event feed adapters
- `economics` (implemented): compensation model builders, settlement helpers, and reconciliation query builders
- `types` (implemented): shared runtime, route, and bridge contracts
- `mission` (planned): local mission graph cache
- `policy` (planned): reusable risk/permission policy packs
- `evidence` (planned): canonical evidence serialization helpers

## 4) Route Families Covered by `client`

As of March 12, 2026, the audited `client` surface spans:

- observability, analytics, ecosystem, and admin routes
- identity, credentials, reputation, roles, anti-spam, security, and ZK routes
- tasks, missions, and disputes routes
- pay, economics, governance, rewards, and onchain finality routes
- compute, heartbeat, data, and developer platform routes

The detailed matrix lives in `docs/route-parity-audit.md`.

## 5) Runtime Loop Model

```text
poll events -> claim mission -> execute -> build evidence -> submit -> checkpoint -> repeat
```

## 6) Failure Semantics

Worker runtime separates outcomes:

- `submitted`
- `skipped` (no mission / policy denied)
- `failed` (execution/runtime errors)

This supports deterministic operations and governance metrics.

## 7) Compatibility Direction

SDK major versions should follow protocol major compatibility.
Compatibility details and route audit notes are maintained in this repo and in `pactcore/meta`.
