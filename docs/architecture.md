# PACT SDK Architecture

## Role in the Ecosystem

The SDK sits between application builders and `core`.

```text
Apps / Agents / Services
          |
         sdk
          |
       core API
```

## Design Principles

1. **Typed by default**: expose stable TypeScript types and method contracts.
2. **Transport-light**: rely on standard `fetch` with pluggable implementation.
3. **Composable**: SDK should be embeddable in frontends, backends, and agents.
4. **Protocol-aligned**: public methods mirror `core` bounded contexts.

## Module Plan

- `client`: HTTP transport and endpoint methods
- `types`: shared request/response contracts
- future `auth`: signing and token helpers
- future `events`: subscription abstractions
- future `adapters`: runtime/platform integrations

## Versioning Strategy

- SDK minor versions track additive API support
- Breaking protocol changes must be reflected in major version bumps
- Maintain compatibility matrix with `core` versions
