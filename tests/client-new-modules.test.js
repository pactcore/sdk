import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client";
function requestBody(captured, index = 0) {
    return (captured[index]?.body ?? {});
}
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
describe("PactSdk - Compute", () => {
    it("registerComputeProvider → POST /compute/providers", async () => {
        const { sdk, captured } = createMockSdk();
        await sdk.registerComputeProvider({
            id: "p1", name: "gpu-node", capabilities: { cpuCores: 8, memoryMB: 16384, gpuCount: 2 },
            pricePerCpuSecondCents: 1, pricePerGpuSecondCents: 5, pricePerMemoryMBHourCents: 2,
            status: "available", registeredAt: Date.now(),
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/compute/providers");
        expect(requestBody(captured).name).toBe("gpu-node");
    });
    it("listComputeProviders → GET /compute/providers", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.listComputeProviders();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/compute/providers");
    });
    it("findComputeProviders → GET /compute/providers/search?...", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.findComputeProviders(4, 8192, 1);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toContain("/compute/providers/search?");
        expect(captured[0].url).toContain("minCpu=4");
        expect(captured[0].url).toContain("minMemory=8192");
        expect(captured[0].url).toContain("minGpu=1");
    });
    it("enqueueComputeJob → POST /compute/jobs", async () => {
        const { sdk, captured } = createMockSdk({ id: "job_1" });
        await sdk.enqueueComputeJob({ image: "python:3.12", command: "python train.py" });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/compute/jobs");
        expect(requestBody(captured).image).toBe("python:3.12");
    });
    it("dispatchComputeJob → POST /compute/jobs/:id/dispatch", async () => {
        const { sdk, captured } = createMockSdk({ jobId: "j1", status: "completed" });
        await sdk.dispatchComputeJob("j1", "prov1");
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/compute/jobs/j1/dispatch");
        expect(requestBody(captured).providerId).toBe("prov1");
    });
    it("getComputeUsageRecords → GET /compute/usage", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.getComputeUsageRecords("j1");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toContain("/compute/usage?jobId=j1");
    });
    it("getComputeAdapterHealth → GET /compute/adapters/health", async () => {
        const { sdk, captured } = createMockSdk([{ adapter: "docker", state: "healthy" }]);
        await sdk.getComputeAdapterHealth();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/compute/adapters/health");
    });
    it("getComputeAdapterHealth supports summary payloads with runtimeVersion", async () => {
        const { sdk, captured } = createMockSdk({
            status: "healthy",
            checkedAt: 1700000000000,
            runtimeVersion: "0.2.1",
            adapters: [
                {
                    adapter: "docker",
                    state: "healthy",
                    checkedAt: 1700000000000,
                    features: { coldStarts: false },
                },
            ],
        });
        const health = await sdk.getComputeAdapterHealth();
        expect(Array.isArray(health)).toBe(false);
        if (Array.isArray(health)) {
            throw new Error("expected summary payload");
        }
        expect(health.runtimeVersion).toBe("0.2.1");
        expect(health.adapters[0]?.features?.coldStarts).toBe(false);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/compute/adapters/health");
    });
});
describe("PactSdk - Identity/DID", () => {
    it("getDIDDocument → GET /id/did/:participantId", async () => {
        const { sdk, captured } = createMockSdk({ id: "did:pact:agent-1" });
        await sdk.getDIDDocument("agent-1");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/id/did/agent-1");
    });
    it("issueCredential → POST /id/credentials", async () => {
        const { sdk, captured } = createMockSdk({ id: "vc_1" });
        await sdk.issueCredential({
            issuerId: "i1", subjectId: "w1", capability: "delivery.certified",
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/id/credentials");
        expect(requestBody(captured).capability).toBe("delivery.certified");
    });
    it("verifyCredential → POST /id/credentials/verify", async () => {
        const { sdk, captured } = createMockSdk({ valid: true });
        await sdk.verifyCredential({
            id: "vc_1", type: ["VerifiableCredential"], issuer: "i1",
            issuanceDate: Date.now(), credentialSubject: { id: "w1" },
            proof: { type: "test", created: Date.now(), verificationMethod: "x", proofValue: "abc" },
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/id/credentials/verify");
        expect(captured[0].body.credential).toBeDefined();
    });
    it("checkCapability → GET /id/capabilities/:id/:cap", async () => {
        const { sdk, captured } = createMockSdk({ hasCapability: true });
        await sdk.checkCapability("w1", "mission.execute");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/id/capabilities/w1/mission.execute");
    });
});
describe("PactSdk - Data", () => {
    it("publishDataAsset → POST /data/assets", async () => {
        const { sdk, captured } = createMockSdk({ id: "data_1" });
        await sdk.publishDataAsset({ ownerId: "u1", title: "Dataset", uri: "s3://data" });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/data/assets");
    });
    it("listDataAssets → GET /data/assets", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.listDataAssets();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/data/assets");
    });
    it("getDataAssetLineage → GET /data/assets/:id/lineage", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.getDataAssetLineage("data_1");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/data/assets/data_1/lineage");
    });
    it("registerIntegrityProof → POST /data/assets/:id/integrity", async () => {
        const { sdk, captured } = createMockSdk({ assetId: "d1", hash: "abc" });
        await sdk.registerIntegrityProof("d1", "abc123");
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/data/assets/d1/integrity");
        expect(requestBody(captured).contentHash).toBe("abc123");
    });
    it("verifyDataIntegrity → POST /data/assets/:id/integrity/verify", async () => {
        const { sdk, captured } = createMockSdk({ valid: true });
        await sdk.verifyDataIntegrity("d1", "abc123");
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/data/assets/d1/integrity/verify");
    });
    it("setDataAccessPolicy → PUT /data/assets/:id/access", async () => {
        const { sdk, captured } = createMockSdk({});
        await sdk.setDataAccessPolicy("d1", ["u1", "u2"], false);
        expect(captured[0].method).toBe("PUT");
        expect(captured[0].url).toBe("https://api.pact/data/assets/d1/access");
        expect(requestBody(captured).isPublic).toBe(false);
    });
    it("checkDataAccess → GET /data/assets/:id/access/:participantId", async () => {
        const { sdk, captured } = createMockSdk({ allowed: true });
        await sdk.checkDataAccess("d1", "u1");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/data/assets/d1/access/u1");
    });
    it("getDataAdapterHealth → GET /data/adapters/health", async () => {
        const { sdk, captured } = createMockSdk([{ adapter: "s3", state: "healthy" }]);
        await sdk.getDataAdapterHealth();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/data/adapters/health");
    });
});
describe("PactSdk - Dev/Governance", () => {
    it("registerDevIntegration → POST /dev/integrations", async () => {
        const { sdk, captured } = createMockSdk({ id: "dev_1" });
        await sdk.registerDevIntegration({ ownerId: "d1", name: "hook", webhookUrl: "https://x.com" });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/dev/integrations");
    });
    it("listDevIntegrations → GET /dev/integrations", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.listDevIntegrations();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/dev/integrations");
    });
    it("activateIntegration → POST /dev/integrations/:id/activate", async () => {
        const { sdk, captured } = createMockSdk({ status: "active" });
        await sdk.activateIntegration("dev_1");
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/dev/integrations/dev_1/activate");
    });
    it("getDevIntegrationHealth → GET /dev/integrations/health", async () => {
        const { sdk, captured } = createMockSdk([{ integrationId: "dev_1", state: "healthy" }]);
        await sdk.getDevIntegrationHealth();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/dev/integrations/health");
    });
    it("registerPolicy → POST /dev/policies", async () => {
        const { sdk, captured } = createMockSdk();
        const now = Date.now();
        await sdk.registerPolicy({
            id: "pkg_1", name: "security", version: "1.0", rules: [],
            ownerId: "admin", createdAt: now, updatedAt: now,
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/dev/policies");
    });
    it("evaluatePolicy → POST /dev/policies/evaluate", async () => {
        const { sdk, captured } = createMockSdk({ allowed: true, matchedRules: [] });
        await sdk.evaluatePolicy({ action: "read" });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/dev/policies/evaluate");
    });
    it("registerTemplate → POST /dev/templates", async () => {
        const { sdk, captured } = createMockSdk({ id: "tmpl_1" });
        await sdk.registerTemplate({
            name: "ts-starter", language: "TypeScript",
            repoUrl: "https://github.com/x", description: "Starter",
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/dev/templates");
    });
    it("listTemplates → GET /dev/templates", async () => {
        const { sdk, captured } = createMockSdk([]);
        await sdk.listTemplates();
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/dev/templates");
    });
});
