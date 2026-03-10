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
describe("PactSdk - Batch 8 - Token economics", () => {
    it("getTokenDistribution -> GET /economics/token/distribution", async () => {
        const { sdk, captured } = createMockSdk({
            token: { symbol: "PACT" },
            distribution: [],
            totalAllocated: 1_000_000_000,
        });
        await sdk.getTokenDistribution();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/token/distribution");
    });
    it("getTokenSupply -> GET /economics/token/supply", async () => {
        const { sdk, captured } = createMockSdk({ months: 12, projections: [] });
        await sdk.getTokenSupply();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/token/supply");
    });
    it("getTokenSupply(months) -> GET /economics/token/supply?months=", async () => {
        const { sdk, captured } = createMockSdk({ months: 6, projections: [] });
        await sdk.getTokenSupply(6);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/economics/token/supply?months=6");
    });
    it("calculateTokenApy -> POST /economics/token/apy", async () => {
        const { sdk, captured } = createMockSdk({ apy: 15 });
        await sdk.calculateTokenApy({ totalStaked: 1_000_000, emissionRate: 150_000 });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/economics/token/apy");
        expect(captured[0].body.totalStaked).toBe(1_000_000);
        expect(captured[0].body.emissionRate).toBe(150_000);
    });
    it("calculateTokenBurnRate -> POST /economics/token/burn-rate", async () => {
        const { sdk, captured } = createMockSdk({ burnedAmount: 3_000, netVolume: 97_000 });
        await sdk.calculateTokenBurnRate({ transactionVolume: 100_000, burnPercent: 3 });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/economics/token/burn-rate");
        expect(captured[0].body.transactionVolume).toBe(100_000);
        expect(captured[0].body.burnPercent).toBe(3);
    });
});
describe("PactSdk - Batch 8 - Role/participant matrix", () => {
    it("getRoleCapabilities -> GET /roles/:role/capabilities", async () => {
        const { sdk, captured } = createMockSdk({ role: "worker", capabilities: { tasks: { claim: true } } });
        await sdk.getRoleCapabilities("worker");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/roles/worker/capabilities");
    });
    it("getRoleRequirements -> GET /roles/:role/requirements", async () => {
        const { sdk, captured } = createMockSdk({
            role: "validator",
            requirements: { minReputation: 70, requiredIdentityLevel: "trusted", minStake: 2500 },
        });
        await sdk.getRoleRequirements("validator");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/roles/validator/requirements");
    });
    it("checkRoleAction -> POST /roles/check-action", async () => {
        const { sdk, captured } = createMockSdk({ allowed: true });
        await sdk.checkRoleAction({
            role: "task_issuer",
            module: "tasks",
            action: "create",
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/roles/check-action");
        expect(captured[0].body.role).toBe("task_issuer");
        expect(captured[0].body.module).toBe("tasks");
        expect(captured[0].body.action).toBe("create");
    });
    it("getParticipantMatrixCategory -> POST /participants/matrix/category", async () => {
        const { sdk, captured } = createMockSdk({
            category: "agent_organization",
            applicableRoles: ["task_issuer", "governor"],
        });
        await sdk.getParticipantMatrixCategory({
            type: "organization",
            isAgent: true,
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/participants/matrix/category");
        expect(captured[0].body.type).toBe("organization");
        expect(captured[0].body.isAgent).toBe(true);
    });
});
