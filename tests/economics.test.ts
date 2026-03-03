import { describe, expect, it } from "bun:test";
import { buildCompensationModel, summarizeCompensationByAsset } from "../src/economics";

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
});
