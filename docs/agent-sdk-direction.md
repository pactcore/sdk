# SDK Direction for Agent-Native Builders

## Why This Matters

If PACT is agent-first, the SDK must optimize for autonomous loops, not only API wrappers.

## Proposed SDK Surfaces

1. `client` — transport adapters (HTTP, future stream/queue)
2. `mission` — mission lifecycle helpers and local state cache
3. `events` — subscription cursors, replay, and checkpointing
4. `policy` — capability envelope and guardrail middleware
5. `evidence` — canonical evidence packaging and hash utilities
6. `agent` — high-level runtime helpers for worker/validator agents

## Suggested Agent Runtime API

```ts
const runtime = createWorkerRuntime({
  sdk,
  policy,
  handlers,
});

await runtime.subscribe();
await runtime.claimNextMission();
await runtime.execute();
await runtime.submitEvidence();
```

## Design Constraints

- idempotent operations for retries
- deterministic serialization for evidence bundles
- resilient checkpointing for long-running agents
- explicit failure channels (recoverable vs terminal)

## Compatibility Contract

SDK major versions should map to protocol major versions in `core`.
A published compatibility table must be maintained in `meta`.
