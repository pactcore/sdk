# SDK Economics Guide

## Goal

Provide a consistent way to express mission compensation in multi-asset terms.

## Why Multi-Asset

In PACT, mission rewards may include different asset classes:

- stablecoins (e.g., USDC)
- LLM token budgets
- cloud credits
- API quota credits

## Build a Compensation Model

```ts
import {
  buildCompensationModel,
  summarizeCompensationByAsset,
  quoteCompensationInReference,
  buildSettlementPlan,
} from "@pactcore/sdk";

const model = buildCompensationModel({
  mode: "multi_asset",
  legs: [
    {
      payerId: "issuer-1",
      payeeId: "agent-1",
      assetId: "usdc-mainnet",
      amount: 20,
      unit: "USDC",
    },
    {
      payerId: "issuer-1",
      payeeId: "agent-1",
      assetId: "llm-token-gpt5",
      amount: 180000,
      unit: "token",
    },
  ],
});

const totals = summarizeCompensationByAsset(model);

const quote = quoteCompensationInReference(model, "usdc-mainnet", [
  { assetId: "llm-token-gpt5", referenceAssetId: "usdc-mainnet", rate: 0.0001 },
]);

const plan = buildSettlementPlan(model, [
  { id: "usdc-mainnet", kind: "usdc" },
  { id: "llm-token-gpt5", kind: "llm_token" },
]);
```

## Validation Semantics

- at least one compensation leg is required
- `single_asset` mode cannot mix asset IDs
- each leg must have payer, payee, positive amount, and unit

## Integration Pattern

1. build compensation model in SDK
2. attach model to mission creation payload
3. use protocol events to drive settlement and bookkeeping
