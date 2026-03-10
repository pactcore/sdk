import { describe, expect, it } from "bun:test";
import {
  buildReconciliationQueueQueryParams,
  buildCompensationModel,
  summarizeCompensationByAsset,
  quoteCompensationInReference,
  buildSettlementPlan,
  buildSettlementExecutionRequest,
  buildSettlementAuditQueryParams,
  buildSettlementReplayQueryParams,
} from "../src/economics";

describe("SDK economics helpers", () => {
  it("builds multi-asset compensation model", () => {
    const model = buildCompensationModel({
      legs: [
        {
          payerId: "issuer-1",
          payeeId: "agent-1",
          assetId: "usdc-mainnet",
          amount: 12,
          unit: "USDC",
        },
        {
          payerId: "issuer-1",
          payeeId: "agent-1",
          assetId: "llm-token-gpt5",
          amount: 220000,
          unit: "token",
        },
      ],
    });

    expect(model.mode).toBe("multi_asset");
    expect(model.legs.length).toBe(2);

    const totals = summarizeCompensationByAsset(model);
    expect(totals["usdc-mainnet"]).toBe(12);
    expect(totals["llm-token-gpt5"]).toBe(220000);
  });

  it("rejects invalid single asset model with mixed assets", () => {
    expect(() =>
      buildCompensationModel({
        mode: "single_asset",
        legs: [
          {
            payerId: "issuer-1",
            payeeId: "agent-1",
            assetId: "usdc-mainnet",
            amount: 5,
            unit: "USDC",
          },
          {
            payerId: "issuer-1",
            payeeId: "agent-1",
            assetId: "cloud-credit",
            amount: 3,
            unit: "credit",
          },
        ],
      }),
    ).toThrow();
  });

  it("quotes model in reference asset using valuation rates", () => {
    const model = buildCompensationModel({
      legs: [
        {
          payerId: "issuer-1",
          payeeId: "agent-1",
          assetId: "usdc-mainnet",
          amount: 10,
          unit: "USDC",
        },
        {
          payerId: "issuer-1",
          payeeId: "agent-1",
          assetId: "llm-gpt5",
          amount: 150000,
          unit: "token",
        },
      ],
    });

    const quote = quoteCompensationInReference(model, "usdc-mainnet", [
      {
        assetId: "llm-gpt5",
        referenceAssetId: "usdc-mainnet",
        rate: 0.0001,
      },
    ]);

    expect(quote.totalInReference).toBe(25);
    expect(quote.missingAssetIds.length).toBe(0);
  });

  it("builds settlement plan rails by asset kind", () => {
    const model = buildCompensationModel({
      legs: [
        {
          payerId: "issuer-1",
          payeeId: "agent-1",
          assetId: "usdc-mainnet",
          amount: 10,
          unit: "USDC",
        },
        {
          payerId: "issuer-1",
          payeeId: "agent-1",
          assetId: "cloud-aws",
          amount: 2,
          unit: "credit",
        },
      ],
    });

    const plan = buildSettlementPlan(model, [
      { id: "usdc-mainnet", kind: "usdc" },
      { id: "cloud-aws", kind: "cloud_credit" },
    ]);

    expect(plan.find((line) => line.assetId === "usdc-mainnet")?.rail).toBe("onchain_stablecoin");
    expect(plan.find((line) => line.assetId === "cloud-aws")?.rail).toBe("cloud_billing");
  });

  it("builds settlement execution request payload", () => {
    const model = buildCompensationModel({
      legs: [
        {
          payerId: "issuer-1",
          payeeId: "agent-1",
          assetId: "llm-gpt5",
          amount: 42000,
          unit: "token",
        },
      ],
    });

    const request = buildSettlementExecutionRequest(model, {
      settlementId: "settlement-sdk-1",
      idempotencyKey: "sdk-settlement-1",
    });
    expect(request.settlementId).toBe("settlement-sdk-1");
    expect(request.idempotencyKey).toBe("sdk-settlement-1");
    expect(request.model.legs.length).toBe(1);
  });

  it("builds settlement audit query params with filters and pagination", () => {
    const query = buildSettlementAuditQueryParams(
      {
        settlementId: "settlement-1",
        rail: "llm_metering",
        status: "reconciled",
        reconciledBy: "auditor-1",
      },
      { cursor: "2", limit: 10 },
    );

    expect(query).toBe(
      "?settlementId=settlement-1&rail=llm_metering&status=reconciled&reconciledBy=auditor-1&cursor=2&limit=10",
    );
  });

  it("builds settlement replay query params", () => {
    const query = buildSettlementReplayQueryParams({ fromOffset: 3, limit: 20 });
    expect(query).toBe("?fromOffset=3&limit=20");
  });

  it("builds reconciliation queue query params", () => {
    const query = buildReconciliationQueueQueryParams({
      state: "failed",
      cursor: "1",
      limit: 25,
    });

    expect(query).toBe("?state=failed&cursor=1&limit=25");
  });
});
