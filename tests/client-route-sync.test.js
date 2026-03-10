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
describe("PactSdk - Route sync coverage", () => {
    it("registerParticipant -> POST /id/participants", async () => {
        const { sdk, captured } = createMockSdk({ id: "participant_1" });
        await sdk.registerParticipant({
            id: "participant_1",
            role: "worker",
            displayName: "Worker One",
            skills: ["mapping"],
            initialReputation: 70,
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/id/participants");
        expect(captured[0].body.displayName).toBe("Worker One");
    });
    it("listWorkers -> GET /id/workers", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.listWorkers();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/id/workers");
    });
    it("createTask -> POST /tasks", async () => {
        const { sdk, captured } = createMockSdk({ id: "task_1" });
        await sdk.createTask({
            title: "Inspect route",
            issuerId: "issuer_1",
            description: "Collect route evidence",
            paymentCents: 1500,
            location: { latitude: 37.78, longitude: -122.41 },
            constraints: {
                requiredSkills: ["survey"],
                maxDistanceKm: 12,
                minReputation: 65,
                capacityRequired: 1,
            },
            stakeCents: 200,
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/tasks");
        expect(captured[0].body.title).toBe("Inspect route");
        expect(captured[0].body.stakeCents).toBe(200);
    });
    it("assignTask -> POST /tasks/:id/assign", async () => {
        const { sdk, captured } = createMockSdk({ id: "task_1", assigneeId: "worker_1" });
        await sdk.assignTask("task_1", "worker_1");
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/tasks/task_1/assign");
        expect(captured[0].body.workerId).toBe("worker_1");
    });
    it("submitTask -> POST /tasks/:id/submit", async () => {
        const { sdk, captured } = createMockSdk({ id: "task_1", status: "Submitted" });
        await sdk.submitTask("task_1", {
            summary: "Work complete",
            artifactUris: ["ipfs://artifact-1"],
            validation: {
                autoAIScore: 0.97,
                agentVotes: [{ participantId: "agent_1", approve: true }],
                humanVotes: [{ participantId: "human_1", approve: true }],
            },
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/tasks/task_1/submit");
        expect(captured[0].body.summary).toBe("Work complete");
    });
    it("getTask -> GET /tasks/:id", async () => {
        const { sdk, captured } = createMockSdk({ id: "task_1" });
        await sdk.getTask("task_1");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/tasks/task_1");
    });
    it("getDataAssetDependents -> GET /data/assets/:assetId/dependents", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.getDataAssetDependents("asset_1");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/data/assets/asset_1/dependents");
    });
    it("getLedger -> GET /payments/ledger", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.getLedger();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/payments/ledger");
    });
    it("suspendIntegration -> POST /dev/integrations/:id/suspend", async () => {
        const { sdk, captured } = createMockSdk({ id: "dev_1", status: "suspended" });
        await sdk.suspendIntegration("dev_1");
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/dev/integrations/dev_1/suspend");
    });
    it("deprecateIntegration -> POST /dev/integrations/:id/deprecate", async () => {
        const { sdk, captured } = createMockSdk({ id: "dev_1", status: "deprecated" });
        await sdk.deprecateIntegration("dev_1");
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/dev/integrations/dev_1/deprecate");
    });
});
