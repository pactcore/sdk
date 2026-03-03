# Runtime Composition Guide

This guide shows how to compose `@pactcore/sdk` runtime pieces into a production worker agent.

## 1) Components

- `MissionSource`: claim and submit mission operations
- `MissionEventFeed`: cursor-based event polling
- `WorkerRuntimeCheckpointStore`: resumable local state
- `WorkerRuntimePolicy`: claim/submit guardrails
- `WorkerRuntimeHandlers`: mission execution hooks

## 2) Recommended Assembly

```ts
const runtime = createWorkerRuntime({
  agentId: "worker-1",
  missionSource,
  eventFeed,
  checkpointStore,
  policy,
  handlers,
});

const report = await runtime.runLoop({ iterations: 25, pollLimit: 100 });
```

## 3) Operational Rules

1. keep mission execution deterministic where possible
2. persist checkpoint after each loop iteration
3. treat `skipped` and `failed` as first-class metrics
4. separate transport errors from mission execution errors

## 4) Suggested Handler Split

- `onEventsPolled`: update local views or trigger prefetch
- `executeMission`: pure mission logic and artifact generation
- `onMissionSubmitted`: emit telemetry and internal bookkeeping
- `onMissionFailed`: classify recoverable vs terminal errors

## 5) Safety Defaults

- deny unknown mission classes by policy
- cap artifact sizes and enforce hash checks
- bound loop iterations in constrained environments
- require explicit opt-in for side-effectful tools
