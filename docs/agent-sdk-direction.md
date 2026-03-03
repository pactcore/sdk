# SDK Direction for Agent-Native Builders

## Why This Matters

PACT targets mixed labor economies where humans and agents are both protocol actors.
SDK design must therefore optimize for autonomous execution and economic interoperability.

## Strategic Tracks

### Track A — Runtime Reliability

- hardened worker loops
- checkpoint persistence
- explicit skip/fail semantics
- resumable event cursor processing

### Track B — Governance & Policy

- capability policy packs
- mission risk classes
- preflight policy simulation

### Track C — Economic Composition

- multi-asset compensation builders
- settlement intent validation
- cost accounting helpers by asset class

## Runtime Shape

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

## Constraints

- idempotent side effects
- deterministic evidence and compensation serialization
- resumable processing via checkpoint + cursor
- explicit policy gates before mission claim and evidence submit

## Near-Term Milestones

1. SSE/queue/MCP event source adapters
2. validator and jury runtime helpers
3. mission graph cache and local conflict utilities
4. compensation conversion and treasury-fee policy helpers
