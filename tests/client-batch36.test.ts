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

    const summary = await sdk.getComputeManagedBackendHealth();

    expect(summary.status).toBe("healthy");
    expect(summary.backends[0]?.domain).toBe("compute");
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

    const summary = await sdk.getDataManagedBackendHealth();

    expect(summary.backends[0]?.capability).toBe("observability");
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
        },
      ],
    });

    const summary = await sdk.getDevManagedBackendHealth();

    expect(summary.backends[0]?.domain).toBe("dev");
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
