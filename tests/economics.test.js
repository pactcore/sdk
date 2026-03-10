import { describe, expect, it } from "bun:test";
import { buildReconciliationQueueQueryParams, buildCompensationModel, summarizeCompensationByAsset, quoteCompensationInReference, buildSettlementPlan, buildSettlementExecutionRequest, buildSettlementAuditQueryParams, buildSettlementReplayQueryParams, } from "../src/economics";
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
        expect(() => buildCompensationModel({
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
        })).toThrow();
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
        const query = buildSettlementAuditQueryParams({
            settlementId: "settlement-1",
            rail: "llm_metering",
            status: "reconciled",
            reconciledBy: "auditor-1",
        }, { cursor: "2", limit: 10 });
        expect(query).toBe("?settlementId=settlement-1&rail=llm_metering&status=reconciled&reconciledBy=auditor-1&cursor=2&limit=10");
    });
    it("builds settlement replay query params", () => {
        const query = buildSettlementReplayQueryParams({ fromOffset: 3, limit: 20 });
        expect(query).toBe("?fromOffset=3&limit=20");
    });
    it("builds reconciliation queue query params", () => {
        const query = buildReconciliationQueueQueryParams({
            state: "failed",
            connector: "llm_token_metering",
            settlementId: "settlement-1",
            idempotencyKey: "idem-1",
            cursor: "1",
            limit: 25,
        });
        expect(query).toBe("?state=failed&connector=llm_token_metering&settlementId=settlement-1&idempotencyKey=idem-1&cursor=1&limit=25");
    });
    it("builds reconciliation queue query params for stablecoin bridge records", () => {
        const query = buildReconciliationQueueQueryParams({
            state: "pending",
            connector: "stablecoin_bridge",
            settlementId: "settlement-onchain-1",
            idempotencyKey: "idem-onchain-1",
            cursor: "3",
            limit: 10,
        });
        expect(query).toBe("?state=pending&connector=stablecoin_bridge&settlementId=settlement-onchain-1&idempotencyKey=idem-onchain-1&cursor=3&limit=10");
    });
    it("supports managed settlement connector request/result contracts", async () => {
        const connector = {
            getHealth: () => ({
                state: "closed",
                retryPolicy: { maxRetries: 3, backoffMs: 250 },
                circuitBreaker: { failureThreshold: 5, cooldownMs: 1000 },
                timeoutMs: 2000,
                consecutiveFailures: 0,
            }),
            resetHealth: () => { },
            hasExternalReference: async (externalReference) => externalReference === "metering-1",
            applyMeteringCredit: async (input) => ({
                externalReference: `metering:${input.idempotencyKey}`,
                appliedAt: 1700000000000,
                connectorMetadata: input.metadata,
            }),
        };
        const request = {
            settlementId: "settlement-1",
            legId: "leg-1",
            assetId: "llm-gpt5",
            payerId: "issuer-1",
            payeeId: "worker-1",
            amount: 42000,
            unit: "token",
            idempotencyKey: "idem-connector-1",
            metadata: { provider: "gpt5" },
        };
        const result = await connector.applyMeteringCredit(request);
        expect(result.externalReference).toBe("metering:idem-connector-1");
        expect(result.connectorMetadata?.provider).toBe("gpt5");
        expect(await connector.hasExternalReference("metering-1")).toBe(true);
    });
});
