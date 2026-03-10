import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client";
import { buildCompensationModel, buildSettlementExecutionRequest } from "../src/economics";

describe("SDK settlement runtime helpers", () => {
  it("executes settlement and queries reconciliation/audit records through core APIs", async () => {
    const captured: Array<{
      url: string;
      method: string;
      body?: unknown;
      headers?: Record<string, string>;
    }> = [];
    const sdk = new PactSdk({
      baseUrl: "https://core.pact",
      fetchImpl: async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        const headers = init?.headers
          ? Object.fromEntries(new Headers(init.headers).entries())
          : undefined;
        captured.push({ url, method, body, headers });

        if (url.endsWith("/economics/settlements/execute")) {
          return new Response(
            JSON.stringify({
              settlementId: "settlement-sdk-1",
              executedAt: 1700000000000,
              idempotencyKey: "sdk-settlement-1",
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

        if (url.includes("/economics/settlements/records/page?")) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: "record-1",
                  settlementId: "settlement-sdk-1",
                  rail: "llm_metering",
                  status: "reconciled",
                  reconciledBy: "auditor-1",
                },
              ],
              nextCursor: "1",
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        if (url.includes("/economics/settlements/records/replay?")) {
          return new Response(
            JSON.stringify({
              entries: [
                {
                  offset: 0,
                  action: "created",
                  recordId: "record-1",
                  settlementId: "settlement-sdk-1",
                  status: "applied",
                  occurredAt: 1700000000000,
                  record: {
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
                },
              ],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        if (url.endsWith("/economics/settlements/records/record-1/reconcile")) {
          return new Response(
            JSON.stringify({
              id: "record-1",
              settlementId: "settlement-sdk-1",
              rail: "llm_metering",
              status: "reconciled",
              reconciledBy: "auditor-1",
              reconciledAt: 1700000001000,
            }),
            {
              status: 200,
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
                status: "applied",
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
      buildSettlementExecutionRequest(model, {
        settlementId: "settlement-sdk-1",
        idempotencyKey: "sdk-settlement-1",
      }),
    );
    expect(execution.records.length).toBe(1);
    expect(execution.idempotencyKey).toBe("sdk-settlement-1");
    expect(captured[0]?.method).toBe("POST");
    expect((captured[0]?.body as Record<string, unknown>).idempotencyKey).toBe("sdk-settlement-1");
    expect(captured[0]?.headers?.["idempotency-key"]).toBe("sdk-settlement-1");

    const records = await sdk.listSettlementRecords({
      settlementId: "settlement-sdk-1",
      rail: "llm_metering",
    });
    expect(records.length).toBe(1);
    expect(captured[1]?.url).toBe(
      "https://core.pact/economics/settlements/records?settlementId=settlement-sdk-1&rail=llm_metering",
    );

    const auditPage = await sdk.querySettlementAuditRecords(
      {
        settlementId: "settlement-sdk-1",
        status: "reconciled",
        reconciledBy: "auditor-1",
      },
      {
        limit: 1,
        cursor: "0",
      },
    );
    expect(auditPage.items.length).toBe(1);
    expect(captured[2]?.url).toBe(
      "https://core.pact/economics/settlements/records/page?settlementId=settlement-sdk-1&status=reconciled&reconciledBy=auditor-1&cursor=0&limit=1",
    );

    const reconciliationPage = await sdk.querySettlementReconciliationRecords(
      {
        settlementId: "settlement-sdk-1",
      },
      {
        limit: 2,
      },
    );
    expect(reconciliationPage.items.length).toBe(1);
    expect(captured[3]?.url).toBe(
      "https://core.pact/economics/settlements/records/page?settlementId=settlement-sdk-1&status=reconciled&limit=2",
    );

    const replay = await sdk.replaySettlementRecordLifecycle({ fromOffset: 0, limit: 10 });
    expect(replay.entries.length).toBe(1);
    expect(captured[4]?.url).toBe(
      "https://core.pact/economics/settlements/records/replay?fromOffset=0&limit=10",
    );

    const reconciled = await sdk.reconcileSettlementRecord("record-1", {
      reconciledBy: "auditor-1",
      note: "ledger matched",
    });
    expect(reconciled.status).toBe("reconciled");
    expect(captured[5]?.method).toBe("POST");
    expect(captured[5]?.url).toBe("https://core.pact/economics/settlements/records/record-1/reconcile");

    const record = await sdk.getSettlementRecord("record-1");
    expect(record.settlementId).toBe("settlement-sdk-1");
    expect(captured[6]?.url).toBe("https://core.pact/economics/settlements/records/record-1");
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
