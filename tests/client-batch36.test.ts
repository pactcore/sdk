import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client";
import type { FetchLike } from "../src/client";

interface CapturedRequest {
  method: string;
  url: string;
  body?: unknown;
}

function createMockSdk(responseBody: unknown = {}) {
  const captured: CapturedRequest[] = [];

  const fetchImpl: FetchLike = async (input, init) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
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
});

describe("PactSdk - Batch 36 - Managed backends", () => {
  it("getComputeManagedBackendHealth -> GET /compute/backends/health", async () => {
    const { sdk, captured } = createMockSdk({
      status: "healthy",
      checkedAt: 1700000000000,
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
    expect(health.backends[0]?.domain).toBe("compute");
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
    expect((captured[0].body as Record<string, unknown>).version).toBe("1.2.3");
    expect(
      ((captured[0].body as Record<string, unknown>).supportedCoreVersions as string[])[0],
    ).toBe("^0.2.0");
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
