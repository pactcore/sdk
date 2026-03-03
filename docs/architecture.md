# PACT SDK Architecture

## Role in the Ecosystem

The SDK sits between application/agent builders and `core`.

```text
Apps / Agents / Services
          |
         sdk
          |
       core protocol runtime
```

## Design Principles

1. **Agent-first ergonomics**: support autonomous mission loops, not only request wrappers.
2. **Typed by default**: expose stable TypeScript contracts.
3. **Transport-light**: use standard `fetch` with pluggable implementation.
4. **Composable**: embeddable in frontends, backends, and long-running agent processes.
5. **Protocol-aligned**: methods and models mirror `core` bounded contexts.

## Module Plan

- `client`: transport adapters and basic endpoint methods
- `types`: shared request/response and protocol-facing contracts
- `mission` (planned): mission lifecycle helpers
- `events` (planned): subscriptions, replay cursors, checkpoints
- `policy` (planned): capability envelopes and guard middleware
- `evidence` (planned): canonical evidence packaging
- `agent` (planned): high-level worker/validator runtimes

## Versioning Strategy

- SDK minor versions track additive functionality.
- Breaking protocol changes require major version bump.
- Compatibility matrix (`core` <-> `sdk`) is maintained in `meta`.
