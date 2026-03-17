# CLAUDE.md — PACT SDK

## Project
TypeScript SDK client for PACT Network. Provides typed API surface matching core routes.

## Stack
- Runtime: Bun (use `bun test`, `bun run`, `bunx`)
- Language: TypeScript
- No framework — pure client library

## Commands
- `bun test` — run all tests
- `bun run typecheck` — type-check

## Rules
- Do not fix tests by weakening domain rules
- Keep SDK surface in sync with core API routes
- All new methods need corresponding test coverage
- Preserve existing test count baseline (411+)
- Use Bun-native APIs where possible

## Architecture
- src/types.ts — all type definitions
- src/client.ts — PactClient class with all API methods
- src/economics.ts — economic model calculations
- src/event-sources.ts — event streaming
- src/worker-runtime.ts — worker-side runtime
- src/index.ts — exports

## Current ERC-8183 Gaps (sync with core)
The core repo recently added ERC-8183 features. SDK needs:

### Types to add in types.ts:
1. CommitteeReview types:
   - `CommitteeVote`, `CommitteeConfig`, `CommitteeSession`
   - Committee status: "voting" | "decided" | "deadlocked" | "expired"
2. Enhanced dispute types:
   - Add to DisputeStatus: "expired" | "committee_review"
   - Add to DisputeCase: bondAmountCents, bondStatus, bondUnit, bondAsset
   - Add: evidenceDeadlineAt, votingDeadlineAt, subjectType, subjectRef, evidenceHash
3. Settlement split types:
   - SettlementSplit { workerPct, validatorPct, treasuryPct, issuerPct }
   - SettlementBreakdown with per-party amounts
4. Validation pipeline types:
   - ValidationLayer: "AutoAI" | "CommitteeReview" | "HumanJury"
   - ValidationPipelineConfig with committeeReview option
5. Human jury types:
   - JurorSelection, JurySession, JuryExpiry

### Client methods to add in client.ts:
1. Committee: createCommitteeSession, submitCommitteeVote, getCommitteeSession
2. Disputes: openDispute (with bond), submitDisputeEvidence, closeEvidencePeriod, expireDispute
3. Settlement: getSettlementBreakdown, getSettlementSplits
4. Jury: requestJuryPanel, castJuryVote, expireJurySession
5. Validation: getValidationPipelineConfig, triggerValidation

### Tests needed:
- Each new type should have construction/validation tests
- Each new client method should have request/response tests
- Match the test patterns already in tests/
