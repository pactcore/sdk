# SDK Direction for Agent-Native Builders

## Why This Matters

If PACT is agent-first, SDK design must optimize for autonomous operations, not only request helpers.

## Strategic Direction

### Track A — Transport Reliability

- hardened `PactSdk` transport client
- retries/backoff and idempotency helpers
- consistent error envelope parsing

### Track B — Agent Runtime

- worker runtime loop (implemented)
- checkpoint store interfaces (implemented)
- event cursor polling (implemented)
- validator runtime and jury runtime helpers (planned)

### Track C — Protocol Ergonomics

- mission graph helpers
- evidence canonicalization tools
- policy packs for common risk profiles

## Suggested Runtime Shape

```ts
const runtime = createWorkerRuntime({
  agentId,
  missionSource,
  eventFeed,
  checkpointStore,
  policy,
  handlers,
});

await runtime.runLoop({ iterations: 100, pollLimit: 50 });
```

## Design Constraints

- idempotent side effects
- deterministic serialization for evidence
- resumable processing via cursor/checkpoint
- explicit skip/fail semantics for observability

## Near-Term Milestones

1. introduce event-source adapters (SSE/queue/MCP)
2. add validator runtime package
3. add mission-level local cache abstraction
4. add policy simulation harness for preflight testing
