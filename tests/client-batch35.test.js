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
describe("PactSdk - Batch 35 - Onchain finality", () => {
    it("getOnchainFinalitySummary -> GET /onchain/finality/summary", async () => {
        const { sdk, captured } = createMockSdk({
            trackedTransactionCount: 2,
            submittedCount: 0,
            confirmedCount: 1,
            finalizedCount: 1,
            reorgedCount: 0,
            headBlockNumber: 13,
            confirmationDepth: 2,
            finalityDepth: 4,
        });
        const summary = await sdk.getOnchainFinalitySummary();
        expect(summary.finalizedCount).toBe(1);
        expect(summary.headBlockNumber).toBe(13);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/onchain/finality/summary");
    });
    it("listOnchainTransactions -> GET /onchain/finality/transactions with filters", async () => {
        const { sdk, captured } = createMockSdk({
            items: [
                {
                    txId: "0xtx-1",
                    operation: "governance_proposal_create",
                    status: "finalized",
                    submittedAt: 1700000000000,
                    lastUpdatedAt: 1700000003000,
                    participantId: "council-1",
                    proposalId: "proposal-1",
                    epoch: 7,
                    referenceId: "proposal-1",
                    confirmations: 4,
                    confirmationDepth: 2,
                    finalityDepth: 4,
                },
            ],
            nextCursor: "1",
        });
        const page = await sdk.listOnchainTransactions({
            status: "finalized",
            operation: "governance_proposal_create",
            participantId: "council-1",
            proposalId: "proposal-1",
            epoch: 7,
            referenceId: "proposal-1",
            cursor: "0",
            limit: 10,
        });
        expect(page.items).toHaveLength(1);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/onchain/finality/transactions?status=finalized&operation=governance_proposal_create&participantId=council-1&proposalId=proposal-1&epoch=7&referenceId=proposal-1&cursor=0&limit=10");
    });
    it("getOnchainTransaction -> GET /onchain/finality/transactions/:txId", async () => {
        const { sdk, captured } = createMockSdk({
            txId: "0xtx-reorged",
            operation: "governance_proposal_create",
            status: "reorged",
            submittedAt: 1700000000000,
            reorgedAt: 1700000004000,
            lastUpdatedAt: 1700000004000,
            confirmations: 0,
            confirmationDepth: 1,
            finalityDepth: 2,
        });
        const transaction = await sdk.getOnchainTransaction("0xtx-reorged");
        expect(transaction.status).toBe("reorged");
        expect(transaction.confirmations).toBe(0);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/onchain/finality/transactions/0xtx-reorged");
    });
});
