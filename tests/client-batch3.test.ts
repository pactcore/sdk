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

describe("PactSdk - Batch 3 - Observability/Admin", () => {
  it("getObservabilityHealth -> GET /observability/health", async () => {
    const { sdk, captured } = createMockSdk({ ok: true });
    await sdk.getObservabilityHealth();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/observability/health");
  });

  it("getObservabilityMetrics -> GET /observability/metrics", async () => {
    const { sdk, captured } = createMockSdk({ counters: [], gauges: [], histograms: [] });
    await sdk.getObservabilityMetrics();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/observability/metrics");
  });

  it("getObservabilityTraces -> GET /observability/traces?limit=", async () => {
    const { sdk, captured } = createMockSdk({ limit: 25, traces: [] });
    await sdk.getObservabilityTraces(25);

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/observability/traces?limit=25");
  });

  it("createApiKey -> POST /admin/api-keys", async () => {
    const { sdk, captured } = createMockSdk({ id: "api_1", key: "pact_key" });
    await sdk.createApiKey({ ownerId: "owner_1", permissions: ["read"], rateLimit: 100 });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/admin/api-keys");
    expect((captured[0].body as Record<string, unknown>).ownerId).toBe("owner_1");
  });

  it("listApiKeys -> GET /admin/api-keys?ownerId=", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listApiKeys("owner_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/admin/api-keys?ownerId=owner_1");
  });

  it("revokeApiKey -> DELETE /admin/api-keys/:id", async () => {
    const { sdk, captured } = createMockSdk();
    await sdk.revokeApiKey("api_1");

    expect(captured[0].method).toBe("DELETE");
    expect(captured[0].url).toBe("https://api.pact/admin/api-keys/api_1");
  });

  it("getUsageStats -> GET /admin/usage?apiKeyId=", async () => {
    const { sdk, captured } = createMockSdk({ apiKeyId: "api_1", requestCount: 1 });
    await sdk.getUsageStats("api_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/admin/usage?apiKeyId=api_1");
  });

  it("getOverallUsageStats -> GET /admin/usage/overall", async () => {
    const { sdk, captured } = createMockSdk({ requestCount: 1 });
    await sdk.getOverallUsageStats();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/admin/usage/overall");
  });
});

describe("PactSdk - Batch 3 - Reputation", () => {
  it("listReputationLeaderboard -> GET /reputation/leaderboard?category=&limit=", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listReputationLeaderboard("task_completion", 15);

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toContain("/reputation/leaderboard?");
    expect(captured[0].url).toContain("category=task_completion");
    expect(captured[0].url).toContain("limit=15");
  });

  it("getReputation -> GET /reputation/:participantId", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "worker_1" });
    await sdk.getReputation("worker_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/reputation/worker_1");
  });

  it("recordReputationEvent -> POST /reputation/:participantId/events", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "worker_1" });
    await sdk.recordReputationEvent("worker_1", {
      category: "verification_accuracy",
      delta: 5,
      reason: "high-confidence review",
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/reputation/worker_1/events");
    expect((captured[0].body as Record<string, unknown>).delta).toBe(5);
  });

  it("getReputationHistory -> GET /reputation/:participantId/history?limit=", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.getReputationHistory("worker_1", 20);

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/reputation/worker_1/history?limit=20");
  });
});

describe("PactSdk - Batch 3 - Identity Onchain", () => {
  it("getOnchainIdentity -> GET /id/onchain/:participantId", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "p1" });
    await sdk.getOnchainIdentity("p1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/id/onchain/p1");
  });

  it("syncOnchainIdentity -> POST /id/onchain/:participantId/sync", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "p1" });
    await sdk.syncOnchainIdentity("p1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/id/onchain/p1/sync");
  });

  it("getParticipantLevel -> GET /id/participants/:id/level", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "p1", level: "basic" });
    await sdk.getParticipantLevel("p1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/id/participants/p1/level");
  });

  it("upgradeParticipantLevel -> POST /id/participants/:id/upgrade-level", async () => {
    const { sdk, captured } = createMockSdk({ previousLevel: "basic", newLevel: "verified" });
    await sdk.upgradeParticipantLevel("p1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/id/participants/p1/upgrade-level");
  });

  it("getParticipantStats -> GET /id/participants/:id/stats", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "p1", taskCount: 1 });
    await sdk.getParticipantStats("p1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/id/participants/p1/stats");
  });

  it("recordParticipantTaskCompleted -> POST /id/participants/:id/task-completed", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "p1", taskCount: 2 });
    await sdk.recordParticipantTaskCompleted("p1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/id/participants/p1/task-completed");
  });
});

describe("PactSdk - Batch 3 - ZK Proofs", () => {
  it("createZKLocationProof -> POST /zk/proofs/location", async () => {
    const { sdk, captured } = createMockSdk({ id: "zk_1" });
    await sdk.createZKLocationProof({
      proverId: "p1",
      claim: { latitude: 1, longitude: 2, radius: 10, timestamp: 123 },
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/zk/proofs/location");
    expect((captured[0].body as Record<string, unknown>).proverId).toBe("p1");
  });

  it("createZKCompletionProof -> POST /zk/proofs/completion", async () => {
    const { sdk, captured } = createMockSdk({ id: "zk_2" });
    await sdk.createZKCompletionProof({
      proverId: "p1",
      claim: { taskId: "task_1", evidenceHash: "0xabc", completedAt: 123 },
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/zk/proofs/completion");
  });

  it("createZKIdentityProof -> POST /zk/proofs/identity", async () => {
    const { sdk, captured } = createMockSdk({ id: "zk_3" });
    await sdk.createZKIdentityProof({
      proverId: "p1",
      claim: { participantId: "p1", isHuman: true },
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/zk/proofs/identity");
  });

  it("createZKReputationProof -> POST /zk/proofs/reputation", async () => {
    const { sdk, captured } = createMockSdk({ id: "zk_4" });
    await sdk.createZKReputationProof({
      proverId: "p1",
      claim: { participantId: "p1", minScore: 60, actualAbove: true },
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/zk/proofs/reputation");
  });

  it("verifyZKProof -> POST /zk/proofs/:id/verify", async () => {
    const { sdk, captured } = createMockSdk({ valid: true });
    await sdk.verifyZKProof("zk_1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/zk/proofs/zk_1/verify");
  });

  it("getZKProof -> GET /zk/proofs/:id", async () => {
    const { sdk, captured } = createMockSdk({ id: "zk_1" });
    await sdk.getZKProof("zk_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/zk/proofs/zk_1");
  });
});

describe("PactSdk - Batch 3 - Payment routing", () => {
  it("routePayment -> POST /pay/route", async () => {
    const { sdk, captured } = createMockSdk({ id: "route_1" });
    await sdk.routePayment({ fromId: "alice", toId: "bob", amount: 2500, currency: "USD" });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/route");
    expect((captured[0].body as Record<string, unknown>).amount).toBe(2500);
  });

  it("listPaymentRoutes -> GET /pay/routes", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listPaymentRoutes();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/pay/routes");
  });

  it("addMicropayment -> POST /pay/micropayments", async () => {
    const { sdk, captured } = createMockSdk({ accepted: true });
    await sdk.addMicropayment({ payerId: "alice", payeeId: "bob", amountCents: 25 });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/micropayments");
  });

  it("flushMicropayments -> POST /pay/micropayments/flush", async () => {
    const { sdk, captured } = createMockSdk({ id: "batch_1", entries: [] });
    await sdk.flushMicropayments("alice");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/micropayments/flush");
    expect((captured[0].body as Record<string, unknown>).payerId).toBe("alice");
  });

  it("openCreditLine -> POST /pay/credit-lines", async () => {
    const { sdk, captured } = createMockSdk({ id: "cl_1" });
    await sdk.openCreditLine({ issuerId: "bank", borrowerId: "alice", limitCents: 10000, interestBps: 250 });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/credit-lines");
  });

  it("useCreditLine -> POST /pay/credit-lines/:id/use", async () => {
    const { sdk, captured } = createMockSdk({ id: "cl_1" });
    await sdk.useCreditLine("cl_1", 200);

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/credit-lines/cl_1/use");
    expect((captured[0].body as Record<string, unknown>).amountCents).toBe(200);
  });

  it("repayCreditLine -> POST /pay/credit-lines/:id/repay", async () => {
    const { sdk, captured } = createMockSdk({ id: "cl_1" });
    await sdk.repayCreditLine("cl_1", 50);

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/credit-lines/cl_1/repay");
    expect((captured[0].body as Record<string, unknown>).amountCents).toBe(50);
  });

  it("grantGasSponsorship -> POST /pay/gas-sponsorship", async () => {
    const { sdk, captured } = createMockSdk({ id: "gas_1" });
    await sdk.grantGasSponsorship({ sponsorId: "sponsor", beneficiaryId: "alice", maxGasCents: 5000 });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/gas-sponsorship");
  });

  it("useGasSponsorship -> POST /pay/gas-sponsorship/:id/use", async () => {
    const { sdk, captured } = createMockSdk({ id: "gas_1" });
    await sdk.useGasSponsorship("gas_1", 75);

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/gas-sponsorship/gas_1/use");
    expect((captured[0].body as Record<string, unknown>).gasCents).toBe(75);
  });
});

describe("PactSdk - Batch 3 - Compute pricing", () => {
  it("listComputePricingTiers -> GET /compute/pricing/tiers", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listComputePricingTiers();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/compute/pricing/tiers");
  });

  it("quoteComputePricing -> POST /compute/pricing/quote", async () => {
    const { sdk, captured } = createMockSdk({ estimatedCostCents: 4.2 });
    await sdk.quoteComputePricing({
      capabilities: { cpuCores: 2, memoryMB: 4096, gpuCount: 0 },
      durationSeconds: 1800,
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/compute/pricing/quote");
    expect((captured[0].body as Record<string, unknown>).durationSeconds).toBe(1800);
  });
});

describe("PactSdk - Batch 3 - Data marketplace", () => {
  it("createDataListing -> POST /data/marketplace/list", async () => {
    const { sdk, captured } = createMockSdk({ id: "listing_1" });
    await sdk.createDataListing({ assetId: "data_1", priceCents: 1200, category: "geolocation" });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/data/marketplace/list");
  });

  it("delistDataListing -> DELETE /data/marketplace/listings/:id", async () => {
    const { sdk, captured } = createMockSdk();
    await sdk.delistDataListing("listing_1");

    expect(captured[0].method).toBe("DELETE");
    expect(captured[0].url).toBe("https://api.pact/data/marketplace/listings/listing_1");
  });

  it("listDataListings -> GET /data/marketplace/listings?category=", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listDataListings("sensor");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/data/marketplace/listings?category=sensor");
  });

  it("purchaseDataListing -> POST /data/marketplace/purchase", async () => {
    const { sdk, captured } = createMockSdk({ id: "purchase_1" });
    await sdk.purchaseDataListing({ listingId: "listing_1", buyerId: "buyer_1" });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/data/marketplace/purchase");
    expect((captured[0].body as Record<string, unknown>).listingId).toBe("listing_1");
  });

  it("getDataMarketplaceStats -> GET /data/marketplace/stats", async () => {
    const { sdk, captured } = createMockSdk({ totalListings: 1, totalPurchases: 1, totalRevenueCents: 1200 });
    await sdk.getDataMarketplaceStats();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/data/marketplace/stats");
  });
});

describe("PactSdk - Batch 3 - Plugin marketplace", () => {
  it("publishPlugin -> POST /dev/plugins/publish", async () => {
    const { sdk, captured } = createMockSdk({ listing: { id: "plugin_1" } });
    await sdk.publishPlugin({
      developerId: "dev_1",
      name: "pact-plugin",
      version: "1.0.0",
      description: "plugin",
      repositoryUrl: "https://github.com/pact/plugin",
      priceCents: 999,
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/dev/plugins/publish");
  });

  it("listPlugins -> GET /dev/plugins", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listPlugins();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/dev/plugins");
  });

  it("installPlugin -> POST /dev/plugins/:id/install", async () => {
    const { sdk, captured } = createMockSdk({ id: "install_1" });
    await sdk.installPlugin("plugin_1", "worker_1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/dev/plugins/plugin_1/install");
    expect((captured[0].body as Record<string, unknown>).installerId).toBe("worker_1");
  });

  it("recordPluginRevenue -> POST /dev/plugins/:id/revenue", async () => {
    const { sdk, captured } = createMockSdk({ id: "rev_1" });
    await sdk.recordPluginRevenue("plugin_1", 25000);

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/dev/plugins/plugin_1/revenue");
    expect((captured[0].body as Record<string, unknown>).revenueCents).toBe(25000);
  });

  it("getDeveloperPluginPayouts -> GET /dev/plugins/payouts/:developerId", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.getDeveloperPluginPayouts("dev_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/dev/plugins/payouts/dev_1");
  });
});
