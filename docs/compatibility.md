# Compatibility Matrix

## Protocol Compatibility

| SDK Version | Core Baseline | Notes |
|---|---|---|
| `0.1.x` | mission runtime + mailbox + event journal + challenge/retry | initial public baseline |
| `0.2.x` | + heartbeat supervision + event adapters + compensation model primitives | architecture major update |

## Contract Stability Notes

- `WorkerRuntime` loop/checkpoint APIs are available and stable in `0.2.x`.
- Event feed interfaces support cursor polling semantics in `0.2.x`.
- Compensation model helpers are introduced in `0.2.x`.
- Mission/challenge/economic schemas may expand additively in minor releases.

## Upgrade Guidance

1. pin SDK minor version in production agents
2. validate runtime loops against target `core` release tags
3. verify compensation model compatibility when introducing new asset classes
4. monitor `pactcore/meta` for terminology/runtime spec updates
