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
describe("PactSdk - Batch 36 - Appendix C", () => {
    it("verifyZKProof preserves Appendix C verification receipt fields", async () => {
        const { sdk, captured } = createMockSdk({
            valid: true,
            receipt: {
                id: "receipt_1",
                proofId: "zk_1",
                proofType: "identity",
                verified: true,
                verifier: "zk-prover-bridge",
                manifestId: "manifest_1",
                manifestVersion: "1.0.0",
                manifestIntegrity: "sha256:manifest",
                proofDigest: "proof-digest",
                publicInputsDigest: "inputs-digest",
                traceId: "trace_1",
                adapterReceiptId: "adapter_1",
                checkedAt: 1700000000000,
            },
        });
        const result = await sdk.verifyZKProof("zk_1");
        expect(result.valid).toBe(true);
        expect(result.receipt?.manifestIntegrity).toBe("sha256:manifest");
        expect(result.receipt?.adapterReceiptId).toBe("adapter_1");
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/zk/proofs/zk_1/verify");
    });
    it("getZKProofReceipts -> GET /zk/proofs/:id/receipts", async () => {
        const { sdk, captured } = createMockSdk([
            {
                id: "receipt_1",
                proofId: "zk_1",
                proofType: "completion",
                verified: true,
                verifier: "zk-prover-bridge",
                manifestId: "manifest_1",
                manifestVersion: "1.0.0",
                manifestIntegrity: "sha256:manifest",
                proofDigest: "proof-digest",
                publicInputsDigest: "inputs-digest",
                traceId: "trace_1",
                checkedAt: 1700000000000,
            },
        ]);
        const receipts = await sdk.getZKProofReceipts("zk_1");
        expect(receipts).toHaveLength(1);
        expect(receipts[0]?.verifier).toBe("zk-prover-bridge");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/zk/proofs/zk_1/receipts");
    });
    it("getZKAdapterHealth -> GET /zk/adapters/health", async () => {
        const { sdk, captured } = createMockSdk({
            status: "degraded",
            checkedAt: 1700000000000,
            adapters: [
                {
                    name: "zk-prover-bridge",
                    state: "degraded",
                    durability: "remote",
                    features: {
                        manifestCatalog: true,
                        manifestCatalogState: "unhealthy",
                        providerId: "appendix-c-provider",
                        requiredCredentialFields: "accessToken",
                    },
                    lastError: {
                        adapter: "zk",
                        operation: "configure_remote_bridge",
                        code: "zk_remote_endpoint_missing",
                        message: "remote endpoint missing",
                        retryable: false,
                        occurredAt: 1700000000001,
                    },
                },
            ],
        });
        const health = await sdk.getZKAdapterHealth();
        expect(Array.isArray(health)).toBe(false);
        if (Array.isArray(health)) {
            throw new Error("expected summary payload");
        }
        expect(health.status).toBe("degraded");
        expect(health.adapters[0]?.name).toBe("zk-prover-bridge");
        expect(health.adapters[0]?.features?.providerId).toBe("appendix-c-provider");
        expect(health.adapters[0]?.features?.manifestCatalogState).toBe("unhealthy");
        expect(health.adapters[0]?.lastError?.code).toBe("zk_remote_endpoint_missing");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/zk/adapters/health");
    });
    it("getZKBridgeRuntime -> GET /zk/bridge/runtime", async () => {
        const { sdk, captured } = createMockSdk({
            adapter: "appendix-c-adapter",
            runtimeVersion: "0.2.0",
            durability: "remote",
            manifestCatalog: {
                schemaVersions: ["1.0.0"],
                manifestsByType: {
                    identity: ["1.0.0"],
                },
            },
            features: {
                manifestVersioning: true,
                artifactIntegrity: true,
                receiptTraceability: true,
                deterministicLocalAdapter: false,
                remoteAdapterSkeleton: true,
            },
        });
        const runtime = await sdk.getZKBridgeRuntime();
        expect(runtime.adapter).toBe("appendix-c-adapter");
        expect(runtime.manifestCatalog.manifestsByType.identity?.[0]).toBe("1.0.0");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/zk/bridge/runtime");
    });
    it("listZKArtifactManifests -> GET /zk/manifests with optional type", async () => {
        const { sdk, captured } = createMockSdk([
            {
                id: "manifest_1",
                schemaVersion: "1.0.0",
                proofType: "identity",
                manifestVersion: "1.0.0",
                runtimeVersion: "0.2.0",
                integrityAlgorithm: "sha256",
                circuit: {
                    name: "identity-proof",
                    version: "1.0.0",
                    provingSystem: "groth16",
                },
                artifacts: [],
                createdAt: 1700000000000,
                publishedAt: 1700000001000,
                artifactCount: 0,
                manifestIntegrity: "sha256:manifest",
            },
        ]);
        const manifests = await sdk.listZKArtifactManifests("identity");
        expect(manifests).toHaveLength(1);
        expect(manifests[0]?.schemaVersion).toBe("1.0.0");
        expect(manifests[0]?.artifactCount).toBe(0);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/zk/manifests?type=identity");
    });
    it("getZKArtifactManifest -> GET /zk/manifests/:type with version", async () => {
        const { sdk, captured } = createMockSdk({
            id: "manifest_identity_1",
            schemaVersion: "1.0.0",
            proofType: "identity",
            manifestVersion: "1.0.0",
            runtimeVersion: "0.2.0",
            circuit: {
                name: "identity-proof",
                version: "1.0.0",
                provingSystem: "groth16",
            },
            artifacts: [
                {
                    role: "wasm",
                    uri: "https://artifacts.pact/identity.wasm",
                    version: "1.0.0",
                    integrity: "sha256:artifact",
                    integrityAlgorithm: "sha256",
                    source: "remote",
                },
            ],
            createdAt: 1700000000000,
            manifestIntegrity: "sha256:manifest",
        });
        const manifest = await sdk.getZKArtifactManifest("identity", "1.0.0");
        expect(manifest.artifacts[0]?.source).toBe("remote");
        expect(manifest.artifacts[0]?.integrityAlgorithm).toBe("sha256");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/zk/manifests/identity?version=1.0.0");
    });
});
describe("PactSdk - Batch 36 - Managed backends", () => {
    it("getComputeManagedBackendHealth -> GET /compute/backends/health", async () => {
        const { sdk, captured } = createMockSdk({
            status: "healthy",
            checkedAt: 1700000000000,
            runtimeVersion: "0.2.1",
            adapters: [],
            backends: [
                {
                    name: "compute-store-backend",
                    domain: "compute",
                    capability: "store",
                    mode: "local",
                    state: "healthy",
                    checkedAt: 1700000000000,
                    durable: false,
                    durability: "memory",
                    features: { executionCheckpoints: true },
                },
            ],
        });
        const health = await sdk.getComputeManagedBackendHealth();
        expect(Array.isArray(health)).toBe(false);
        if (Array.isArray(health)) {
            throw new Error("expected summary payload");
        }
        expect(health.status).toBe("healthy");
        expect(health.runtimeVersion).toBe("0.2.1");
        expect(health.backends[0]?.domain).toBe("compute");
        expect(health.backends[0]?.features?.executionCheckpoints).toBe(true);
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/compute/backends/health");
    });
    it("getComputeManagedBackendHealth supports array payloads from live backends", async () => {
        const { sdk, captured } = createMockSdk([
            {
                name: "compute-store-backend",
                domain: "compute",
                capability: "store",
                mode: "remote",
                state: "degraded",
                checkedAt: 1700000000000,
                durable: true,
                durability: "remote",
                features: { executionCheckpoints: true },
            },
        ]);
        const health = await sdk.getComputeManagedBackendHealth();
        expect(Array.isArray(health)).toBe(true);
        if (!Array.isArray(health)) {
            throw new Error("expected array payload");
        }
        expect(health[0]?.mode).toBe("remote");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/compute/backends/health");
    });
    it("getComputeManagedBackendHealth preserves list payloads with backend profile metadata", async () => {
        const { sdk, captured } = createMockSdk([
            {
                name: "compute-queue-backend",
                domain: "compute",
                capability: "queue",
                mode: "remote",
                state: "degraded",
                checkedAt: 1700000000500,
                durable: true,
                durability: "remote",
                features: { liveSettlement: true, runtimeVersion: "0.2.1" },
                compatibility: {
                    compatible: true,
                    currentVersion: "0.2.1",
                    supportedVersions: ["^0.2.0"],
                },
                profile: {
                    backendId: "queue_1",
                    providerId: "bridge-provider",
                    displayName: "Queue bridge",
                    endpoint: "https://queue.example",
                    timeoutMs: 2000,
                    credentialType: "api_key",
                    configuredCredentialFields: ["token"],
                    metadata: { region: "us-east-1" },
                },
            },
        ]);
        const health = await sdk.getComputeManagedBackendHealth();
        expect(Array.isArray(health)).toBe(true);
        if (!Array.isArray(health)) {
            throw new Error("expected list payload");
        }
        expect(health[0]?.profile?.credentialType).toBe("api_key");
        expect(health[0]?.features?.runtimeVersion).toBe("0.2.1");
        expect(health[0]?.features?.liveSettlement).toBe(true);
        expect(health[0]?.profile?.metadata?.region).toBe("us-east-1");
        expect(health[0]?.compatibility?.supportedVersions?.[0]).toBe("^0.2.0");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/compute/backends/health");
    });
    it("getDataManagedBackendHealth -> GET /data/backends/health", async () => {
        const { sdk, captured } = createMockSdk({
            status: "healthy",
            checkedAt: 1700000000000,
            adapters: [],
            backends: [
                {
                    name: "data-observability-backend",
                    domain: "data",
                    capability: "observability",
                    mode: "local",
                    state: "healthy",
                    checkedAt: 1700000000000,
                    features: { lineageTracking: true, integrityVerification: true },
                },
            ],
        });
        const health = await sdk.getDataManagedBackendHealth();
        expect(Array.isArray(health)).toBe(false);
        if (Array.isArray(health)) {
            throw new Error("expected summary payload");
        }
        expect(health.backends[0]?.capability).toBe("observability");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/data/backends/health");
    });
    it("getDevManagedBackendHealth -> GET /dev/backends/health", async () => {
        const { sdk, captured } = createMockSdk({
            status: "healthy",
            checkedAt: 1700000000000,
            adapters: [],
            backends: [
                {
                    name: "dev-observability-backend",
                    domain: "dev",
                    capability: "observability",
                    mode: "local",
                    state: "healthy",
                    checkedAt: 1700000000000,
                    features: { compatibilityChecks: true, runtimeVersion: "0.2.0" },
                    compatibility: {
                        compatible: true,
                        currentVersion: "0.2.0",
                        supportedVersions: ["^0.2.0"],
                    },
                    profile: {
                        backendId: "dev_obs_1",
                        providerId: "managed-dev",
                        credentialType: "bearer",
                        configuredCredentialFields: ["token"],
                    },
                },
            ],
        });
        const health = await sdk.getDevManagedBackendHealth();
        expect(Array.isArray(health)).toBe(false);
        if (Array.isArray(health)) {
            throw new Error("expected summary payload");
        }
        expect(health.backends[0]?.domain).toBe("dev");
        expect(health.backends[0]?.profile?.credentialType).toBe("bearer");
        expect(health.backends[0]?.features?.runtimeVersion).toBe("0.2.0");
        expect(health.backends[0]?.features?.compatibilityChecks).toBe(true);
        expect(health.backends[0]?.compatibility?.currentVersion).toBe("0.2.0");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/dev/backends/health");
    });
    it("registerDevIntegration passes additive managed backend fields", async () => {
        const { sdk, captured } = createMockSdk({
            id: "dev_1",
            ownerId: "owner_1",
            name: "managed hook",
            webhookUrl: "https://hook.example",
            status: "draft",
            createdAt: 1700000000000,
            version: "1.2.3",
            supportedCoreVersions: ["^0.2.0"],
        });
        await sdk.registerDevIntegration({
            ownerId: "owner_1",
            name: "managed hook",
            webhookUrl: "https://hook.example",
            version: "1.2.3",
            supportedCoreVersions: ["^0.2.0"],
        });
        expect(captured[0].method).toBe("POST");
        expect(captured[0].url).toBe("https://api.pact/dev/integrations");
        expect(captured[0].body.version).toBe("1.2.3");
        expect(captured[0].body.supportedCoreVersions[0]).toBe("^0.2.0");
    });
    it("getDevIntegrationHealth supports summary payloads with runtimeVersion", async () => {
        const { sdk, captured } = createMockSdk({
            status: "healthy",
            checkedAt: 1700000000000,
            adapters: [],
            integrations: [
                {
                    integrationId: "dev_1",
                    integrationStatus: "active",
                    state: "healthy",
                    webhookConfigured: true,
                    version: "1.2.3",
                },
            ],
            runtimeVersion: "0.2.0",
        });
        const health = await sdk.getDevIntegrationHealth();
        expect(Array.isArray(health)).toBe(false);
        if (Array.isArray(health)) {
            throw new Error("expected summary payload");
        }
        expect(health.runtimeVersion).toBe("0.2.0");
        expect(health.integrations[0]?.version).toBe("1.2.3");
        expect(captured[0].method).toBe("GET");
        expect(captured[0].url).toBe("https://api.pact/dev/integrations/health");
    });
});
