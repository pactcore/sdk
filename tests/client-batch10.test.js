import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client";
function createMockSdk(responseBody = {}) {
    const captured = [];
    const fetchImpl = async (input, init) => {
        const body = init?.body ? JSON.parse(init.body) : undefined;
        captured.push({
            method: init?.method ?? "GET",
            url: String(input),
            body,
        });
        return new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    };
    const sdk = new PactSdk({ baseUrl: "https://api.pact", fetchImpl });
    return { sdk, captured };
}
describe("PactSdk - Batch 10 - Economics reconciliation", () => {
    it("getEconomicsConnectorHealth -> GET /economics/connectors/health", async () => {
        const { sdk, captured } = createMockSdk([
            {
                adapter: "live-llm-connector",
                connector: "llm_token_metering",
                rail: "llm_metering",
                state: "closed",
                checkedAt: 1700000000000,
                durable: true,
                durability: "remote",
                features: {
                    liveSettlement: true,
                    runtimeVersion: "0.2.1",
                },
                compatibility: {
                    compatible: true,
                    currentVersion: "0.2.1",
                    supportedVersions: ["^0.2.0"],
                },
                retryPolicy: {
                    maxRetries: 2,
                    backoffMs: 1000,
                    backoffStrategy: "exponential",
                    maxBackoffMs: 8000,
                },
                circuitBreaker: { failureThreshold: 3, cooldownMs: 60000 },
                timeoutMs: 1500,
                consecutiveFailures: 0,
                profile: {
                    profileId: "openai-live",
                    providerId: "openai",
                    endpoint: "https://billing.example.test/llm",
                    timeoutMs: 1500,
                    credentialType: "bearer",
                    configuredCredentialFields: ["token"],
                    metadata: { network: "mainnet" },
                },
            },
        ]);
        const health = await sdk.getEconomicsConnectorHealth();
        expect(health[0]?.timeoutMs).toBe(1500);
        expect(health[0]?.durability).toBe("remote");
        expect(health[0]?.features?.runtimeVersion).toBe("0.2.1");
        expect(health[0]?.compatibility?.supportedVersions?.[0]).toBe("^0.2.0");
        expect(health[0]?.retryPolicy.backoffStrategy).toBe("exponential");
        expect(health[0]?.profile?.providerId).toBe("openai");
        expect(health[0]?.profile?.timeoutMs).toBe(1500);
        expect(health[0]?.profile?.metadata?.network).toBe("mainnet");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/connectors/health");
    });
    it("runReconciliationCycle -> POST /economics/reconciliation/run", async () => {
        const { sdk, captured } = createMockSdk({
            reconciledRecordCount: 3,
            pendingRecordCount: 0,
        });
        await sdk.runReconciliationCycle();
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/economics/reconciliation/run");
        expect(captured[0].body).toBeUndefined();
    });
    it("getReconciliationSummary -> GET /economics/reconciliation/summary", async () => {
        const { sdk, captured } = createMockSdk({
            pendingSettlementCount: 1,
            pendingRecordCount: 2,
            failedSettlementCount: 0,
            failedRecordCount: 0,
            connectorHealth: [],
        });
        const summary = await sdk.getReconciliationSummary();
        expect(summary.pendingSettlementCount).toBe(1);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/reconciliation/summary");
    });
    it("resetEconomicsConnector -> POST /economics/connectors/:connectorId/reset", async () => {
        const { sdk, captured } = createMockSdk({
            connector: "llm_token_metering",
            rail: "llm_metering",
            state: "closed",
            retryPolicy: { maxRetries: 2, backoffMs: 1000 },
            circuitBreaker: { failureThreshold: 3, cooldownMs: 60000 },
            timeoutMs: 1500,
            consecutiveFailures: 0,
        });
        const health = await sdk.resetEconomicsConnector("llm_token_metering");
        expect(health.timeoutMs).toBe(1500);
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/economics/connectors/llm_token_metering/reset");
        expect(captured[0].body).toBeUndefined();
    });
    it("listPendingReconciliationSettlements -> GET /economics/reconciliation/pending", async () => {
        const { sdk, captured } = createMockSdk({
            items: [{ settlementId: "settlement-api-pending", state: "pending" }],
            nextCursor: "1",
        });
        const items = await sdk.listPendingReconciliationSettlements();
        expect(items).toHaveLength(1);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/reconciliation/pending?state=pending");
    });
    it("queryReconciliationQueue -> GET /economics/reconciliation/queue with filters", async () => {
        const { sdk, captured } = createMockSdk({
            items: [{ settlementId: "settlement-api-failed", state: "failed", lastError: "boom" }],
        });
        const page = await sdk.queryReconciliationQueue({
            state: "failed",
            connector: "llm_token_metering",
            settlementId: "settlement-api-failed",
            idempotencyKey: "idem-failed-1",
            cursor: "1",
            limit: 10,
        });
        expect(page.items).toHaveLength(1);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/reconciliation/queue?state=failed&connector=llm_token_metering&settlementId=settlement-api-failed&idempotencyKey=idem-failed-1&cursor=1&limit=10");
    });
    it("queryReconciliationQueue supports onchain stablecoin bridge filters", async () => {
        const { sdk, captured } = createMockSdk({
            items: [{ settlementId: "settlement-api-onchain", state: "pending" }],
        });
        const page = await sdk.queryReconciliationQueue({
            state: "pending",
            connector: "stablecoin_bridge",
            settlementId: "settlement-api-onchain",
            idempotencyKey: "idem-onchain-1",
            cursor: "2",
            limit: 5,
        });
        expect(page.items).toHaveLength(1);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/reconciliation/queue?state=pending&connector=stablecoin_bridge&settlementId=settlement-api-onchain&idempotencyKey=idem-onchain-1&cursor=2&limit=5");
    });
    it("listUnreconciledSettlements -> GET /economics/reconciliation/unreconciled", async () => {
        const { sdk, captured } = createMockSdk([{ settlementId: "settlement-api-reconcile" }]);
        await sdk.listUnreconciledSettlements();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/reconciliation/unreconciled");
    });
});
describe("PactSdk - Batch 10 - Governance", () => {
    it("createGovernanceProposal -> POST /governance/proposals", async () => {
        const { sdk, captured } = createMockSdk({ id: "proposal_1", status: "active" });
        await sdk.createGovernanceProposal({
            proposerId: "council-1",
            title: "Enable rewards sync",
            description: "Roll out epoch sync to production simulations",
            quorum: 1,
            votingStartsAt: 100,
            votingEndsAt: 200,
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/governance/proposals");
        expect(captured[0].body.proposerId).toBe("council-1");
        expect(captured[0].body.votingEndsAt).toBe(200);
    });
    it("voteOnGovernanceProposal -> POST /governance/proposals/:id/vote", async () => {
        const { sdk, captured } = createMockSdk({ id: "proposal_1", forVotes: 1 });
        await sdk.voteOnGovernanceProposal("proposal_1", {
            voterId: "delegate-1",
            support: true,
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/governance/proposals/proposal_1/vote");
        expect(captured[0].body.voterId).toBe("delegate-1");
        expect(captured[0].body.support).toBe(true);
    });
    it("executeGovernanceProposal -> POST /governance/proposals/:id/execute", async () => {
        const { sdk, captured } = createMockSdk({ id: "proposal_1", status: "executed" });
        await sdk.executeGovernanceProposal("proposal_1", { executorId: "multisig-1" });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/governance/proposals/proposal_1/execute");
        expect(captured[0].body.executorId).toBe("multisig-1");
    });
});
describe("PactSdk - Batch 10 - Rewards", () => {
    it("distributeEpochRewards -> POST /rewards/epochs/:epoch/distribute", async () => {
        const { sdk, captured } = createMockSdk({ epoch: 11, totalAmountCents: 1500 });
        await sdk.distributeEpochRewards(11, {
            distributions: [
                { participantId: "worker-1", amountCents: 1100 },
                { participantId: "worker-2", amountCents: 400 },
            ],
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/rewards/epochs/11/distribute");
        expect(captured[0].body.distributions[0]?.participantId).toBe("worker-1");
        expect(captured[0].body.distributions[1]?.amountCents).toBe(400);
    });
    it("getParticipantRewards -> GET /rewards/:participantId", async () => {
        const { sdk, captured } = createMockSdk({ participantId: "worker-1", totalRewardsCents: 1100 });
        await sdk.getParticipantRewards("worker-1");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/rewards/worker-1");
    });
});
