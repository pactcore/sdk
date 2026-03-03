# Compatibility Matrix

## Protocol Compatibility (initial)

| SDK Version | Core Baseline | Notes |
|---|---|---|
| `0.1.x` | `core` mission runtime + mailbox + event journal + challenge/retry flow | Initial public compatibility target |

## Contract Stability Notes

- `WorkerRuntime` loop/checkpoint APIs are available in `0.1.x`.
- Event feed interfaces are stable for cursor polling semantics.
- Mission/challenge schemas may expand in minor releases with additive fields.

## Upgrade Guidance

1. pin SDK minor version in production agents
2. run integration tests against target `core` commit/release
3. validate policy behavior when new mission fields appear
4. monitor `pactcore/meta` for compatibility announcements
