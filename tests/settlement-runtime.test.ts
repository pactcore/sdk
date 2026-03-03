import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client";
import { buildCompensationModel, buildSettlementExecutionRequest } from "../src/economics";

describe("SDK settlement runtime helpers", () => {
  it("executes settlement and queries audit records through core APIs", async () => {
    const captured: Array<{ url: string; method: string; body?: unknown }> = [];
    const sdk = new PactSdk({
      baseUrl: "https://core.pact",
      fetchImpl: async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        captured.push({ url, method, body });

        if (url.endsWith("/economics/settlements/execute")) {
          return new Response(
            JSON.stringify({
              settlementId: "settlement-sdk-1",
              executedAt: 1700000000000,
              records: [
                {
                  id: "record-1",
                  settlementId: "settlement-sdk-1",
                  legId: "leg-1",
                  assetId: "llm-gpt5",
                  rail: "llm_metering",
                  connector: "llm_token_metering",
                  payerId: "issuer-1",
                  payeeId: "agent-1",
                  amount: 42000,
                  unit: "token",
                  status: "applied",
                  externalReference: "llm-metering-record-1",
                  createdAt: 1700000000000,
                },
              ],
            }),
            {
              status: 201,
              headers: { "content-type": "application/json" },
            },
          );
        }

        if (url.includes("/economics/settlements/records?")) {
          return new Response(
            JSON.stringify([
              {
                id: "record-1",
                settlementId: "settlement-sdk-1",
                rail: "llm_metering",
              },
            ]),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            id: "record-1",
            settlementId: "settlement-sdk-1",
            rail: "llm_metering",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

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

    const execution = await sdk.executeSettlement(
      buildSettlementExecutionRequest(model, "settlement-sdk-1"),
    );
    expect(execution.records.length).toBe(1);
    expect(captured[0]?.method).toBe("POST");

    const records = await sdk.listSettlementRecords({
      settlementId: "settlement-sdk-1",
      rail: "llm_metering",
    });
    expect(records.length).toBe(1);
    expect(captured[1]?.url).toBe(
      "https://core.pact/economics/settlements/records?settlementId=settlement-sdk-1&rail=llm_metering",
    );

    const record = await sdk.getSettlementRecord("record-1");
    expect(record.settlementId).toBe("settlement-sdk-1");
    expect(captured[2]?.url).toBe("https://core.pact/economics/settlements/records/record-1");
  });

  it("queries settlement records without filters", async () => {
    const sdk = new PactSdk({
      baseUrl: "https://core.pact",
      fetchImpl: async (input) => {
        expect(String(input)).toBe("https://core.pact/economics/settlements/records");
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const records = await sdk.listSettlementRecords();
    expect(records.length).toBe(0);
  });
});
