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

describe("PactSdk - Batch 6 - Events & Analytics", () => {
  it("replayEvents -> GET /events/replay", async () => {
    const { sdk, captured } = createMockSdk({ records: [], nextOffset: 10 });
    await sdk.replayEvents(5, 25);

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/events/replay?fromOffset=5&limit=25");
  });

  it("getNetworkAnalytics -> GET /analytics/network", async () => {
    const { sdk, captured } = createMockSdk({ totalParticipants: 1 });
    await sdk.getNetworkAnalytics();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/analytics/network");
  });

  it("getTaskAnalytics -> GET /analytics/tasks?period=", async () => {
    const { sdk, captured } = createMockSdk({ created: 0, completed: 0, failed: 0, topCategories: [] });
    await sdk.getTaskAnalytics("week");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/analytics/tasks?period=week");
  });

  it("getEconomicsAnalytics -> GET /analytics/economics", async () => {
    const { sdk, captured } = createMockSdk({ totalSettled: 0 });
    await sdk.getEconomicsAnalytics();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/analytics/economics");
  });

  it("getSecurityAnalytics -> GET /analytics/security", async () => {
    const { sdk, captured } = createMockSdk({ spamBlockedCount: 0 });
    await sdk.getSecurityAnalytics();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/analytics/security");
  });
});

describe("PactSdk - Batch 6 - Ecosystem", () => {
  it("getEcosystemStatus -> GET /ecosystem/status", async () => {
    const { sdk, captured } = createMockSdk({ status: "healthy" });
    await sdk.getEcosystemStatus();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/ecosystem/status");
  });

  it("getEcosystemModules -> GET /ecosystem/modules", async () => {
    const { sdk, captured } = createMockSdk({});
    await sdk.getEcosystemModules();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/ecosystem/modules");
  });

  it("getEcosystemSynergy -> GET /ecosystem/synergy", async () => {
    const { sdk, captured } = createMockSdk({ synergyScore: 80 });
    await sdk.getEcosystemSynergy();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/ecosystem/synergy");
  });
});

describe("PactSdk - Batch 6 - Security & ZK", () => {
  it("getSecurityThreats -> GET /security/threats", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.getSecurityThreats();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/security/threats");
  });

  it("runSecurityAudit -> POST /security/audit", async () => {
    const { sdk, captured } = createMockSdk({ overallRiskScore: 12 });
    await sdk.runSecurityAudit({
      participants: 100,
      transactions: 500,
      disputes: 2,
      avgReputation: 73,
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/security/audit");
    expect((captured[0].body as Record<string, unknown>).participants).toBe(100);
  });

  it("getSecuritySybilResistance -> GET /security/sybil-resistance/:participantId", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "p1", score: 80 });
    await sdk.getSecuritySybilResistance("p1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/security/sybil-resistance/p1");
  });

  it("getZKCircuitDefinition -> GET /zk/circuits/:type", async () => {
    const { sdk, captured } = createMockSdk({ proofType: "identity" });
    await sdk.getZKCircuitDefinition("identity");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/zk/circuits/identity");
  });

  it("formalVerifyZKProof -> POST /zk/formal-verify/:proofId", async () => {
    const { sdk, captured } = createMockSdk({ verified: true, proofs: [] });
    await sdk.formalVerifyZKProof("zk_1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/zk/formal-verify/zk_1");
    expect(captured[0].body).toEqual({});
  });
});

describe("PactSdk - Batch 6 - Missions", () => {
  const missionModel = {
    mode: "single_asset" as const,
    legs: [
      {
        id: "leg_1",
        payerId: "issuer_1",
        payeeId: "agent_1",
        assetId: "USDC",
        amount: 1000,
        unit: "USDC_CENTS",
      },
    ],
  };

  it("createMission -> POST /missions", async () => {
    const { sdk, captured } = createMockSdk({ id: "mission_1" });
    await sdk.createMission({
      issuerId: "issuer_1",
      title: "Collect telemetry",
      budgetCents: 25000,
      context: {
        objective: "Collect datapoints",
        constraints: ["geo=US"],
        successCriteria: ["100 samples"],
      },
      compensationModel: missionModel,
      targetAgentIds: ["agent_1"],
      maxRetries: 2,
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/missions");
    expect((captured[0].body as Record<string, unknown>).issuerId).toBe("issuer_1");
  });

  it("listMissions -> GET /missions", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listMissions();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/missions");
  });

  it("getMission -> GET /missions/:id", async () => {
    const { sdk, captured } = createMockSdk({ id: "mission_1" });
    await sdk.getMission("mission_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/missions/mission_1");
  });

  it("claimMission -> POST /missions/:id/claim", async () => {
    const { sdk, captured } = createMockSdk({ id: "mission_1", claimedBy: "agent_1" });
    await sdk.claimMission("mission_1", "agent_1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/missions/mission_1/claim");
    expect((captured[0].body as Record<string, unknown>).agentId).toBe("agent_1");
  });

  it("appendMissionStep -> POST /missions/:id/steps", async () => {
    const { sdk, captured } = createMockSdk({ id: "step_1" });
    await sdk.appendMissionStep("mission_1", {
      agentId: "agent_1",
      kind: "tool_call",
      summary: "Ran ingestion tool",
      inputHash: "0xabc",
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/missions/mission_1/steps");
    expect((captured[0].body as Record<string, unknown>).kind).toBe("tool_call");
  });

  it("submitMissionEvidence -> POST /missions/:id/evidence", async () => {
    const { sdk, captured } = createMockSdk({ id: "bundle_1" });
    await sdk.submitMissionEvidence("mission_1", {
      agentId: "agent_1",
      summary: "Evidence submitted",
      artifactUris: ["ipfs://artifact-1"],
      bundleHash: "0xdef",
      stepId: "step_1",
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/missions/mission_1/evidence");
    expect((captured[0].body as Record<string, unknown>).bundleHash).toBe("0xdef");
  });

  it("recordMissionVerdict -> POST /missions/:id/verdict", async () => {
    const { sdk, captured } = createMockSdk({ id: "verdict_1" });
    await sdk.recordMissionVerdict("mission_1", {
      reviewerId: "reviewer_1",
      approve: true,
      confidence: 0.92,
      notes: "Looks good",
      challengeStakeCents: 500,
      challengeCounterpartyId: "agent_2",
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/missions/mission_1/verdict");
    expect((captured[0].body as Record<string, unknown>).reviewerId).toBe("reviewer_1");
  });

  it("openMissionChallenge -> POST /missions/:id/challenges", async () => {
    const { sdk, captured } = createMockSdk({ id: "mission_1" });
    await sdk.openMissionChallenge("mission_1", {
      challengerId: "agent_2",
      counterpartyId: "agent_1",
      reason: "manual_escalation",
      stakeAmountCents: 700,
      triggeredByVerdictIds: ["verdict_1"],
      notes: "Need human review",
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/missions/mission_1/challenges");
    expect((captured[0].body as Record<string, unknown>).reason).toBe("manual_escalation");
  });

  it("resolveMissionChallenge -> POST /missions/:id/challenges/:challengeId/resolve", async () => {
    const { sdk, captured } = createMockSdk({ id: "mission_1" });
    await sdk.resolveMissionChallenge("mission_1", "challenge_1", {
      resolverId: "jury_1",
      approve: false,
      notes: "Rejected",
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/missions/mission_1/challenges/challenge_1/resolve");
    expect((captured[0].body as Record<string, unknown>).resolverId).toBe("jury_1");
  });
});

describe("PactSdk - Batch 6 - X402", () => {
  it("relayX402Payment -> POST /pay/x402/relay", async () => {
    const { sdk, captured } = createMockSdk({ txId: "x402_1" });
    await sdk.relayX402Payment({
      fromId: "payer_1",
      toId: "payee_1",
      amountCents: 150,
      gasSponsored: true,
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/pay/x402/relay");
    expect((captured[0].body as Record<string, unknown>).fromId).toBe("payer_1");
    expect((captured[0].body as Record<string, unknown>).gasSponsored).toBe(true);
  });

  it("getX402GasStats -> GET /pay/x402/gas-stats/:beneficiaryId", async () => {
    const { sdk, captured } = createMockSdk({ beneficiaryId: "payer_1" });
    await sdk.getX402GasStats("payer_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/pay/x402/gas-stats/payer_1");
  });
});

describe("PactSdk - Batch 6 - Heartbeat", () => {
  it("registerHeartbeatTask -> POST /heartbeat/tasks", async () => {
    const { sdk, captured } = createMockSdk({ id: "hb_1" });
    await sdk.registerHeartbeatTask({
      name: "sync-cache",
      intervalMs: 5000,
      payload: { region: "us-east-1" },
      startAt: 100,
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/heartbeat/tasks");
    expect((captured[0].body as Record<string, unknown>).name).toBe("sync-cache");
  });

  it("listHeartbeatTasks -> GET /heartbeat/tasks", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listHeartbeatTasks();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/heartbeat/tasks");
  });

  it("enableHeartbeatTask -> POST /heartbeat/tasks/:id/enable", async () => {
    const { sdk, captured } = createMockSdk({ id: "hb_1", enabled: true });
    await sdk.enableHeartbeatTask("hb_1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/heartbeat/tasks/hb_1/enable");
    expect(captured[0].body).toEqual({});
  });

  it("disableHeartbeatTask -> POST /heartbeat/tasks/:id/disable", async () => {
    const { sdk, captured } = createMockSdk({ id: "hb_1", enabled: false });
    await sdk.disableHeartbeatTask("hb_1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/heartbeat/tasks/hb_1/disable");
    expect(captured[0].body).toEqual({});
  });

  it("tickHeartbeat -> POST /heartbeat/tick", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.tickHeartbeat(123456);

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/heartbeat/tick");
    expect((captured[0].body as Record<string, unknown>).now).toBe(123456);
  });
});

describe("PactSdk - Batch 6 - Economics", () => {
  const model = {
    mode: "single_asset" as const,
    legs: [
      {
        id: "leg_1",
        payerId: "issuer_1",
        payeeId: "worker_1",
        assetId: "asset_usdc",
        amount: 250,
        unit: "USDC_CENTS",
      },
    ],
  };

  it("registerEconomicsAsset -> POST /economics/assets", async () => {
    const { sdk, captured } = createMockSdk({ id: "asset_usdc" });
    await sdk.registerEconomicsAsset({
      id: "asset_usdc",
      kind: "stablecoin",
      symbol: "USDC",
      network: "base",
      issuer: "circle",
      metadata: { region: "us" },
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/economics/assets");
    expect((captured[0].body as Record<string, unknown>).symbol).toBe("USDC");
  });

  it("listEconomicsAssets -> GET /economics/assets", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listEconomicsAssets();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/economics/assets");
  });

  it("quoteEconomicsCompensation -> POST /economics/quote", async () => {
    const { sdk, captured } = createMockSdk({ totalsByAsset: { asset_usdc: 250 } });
    await sdk.quoteEconomicsCompensation(model);

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/economics/quote");
    expect((captured[0].body as Record<string, unknown>).mode).toBe("single_asset");
  });

  it("registerCompensationValuation -> POST /economics/valuations", async () => {
    const { sdk, captured } = createMockSdk({ assetId: "asset_usdc", rate: 1 });
    await sdk.registerCompensationValuation({
      assetId: "asset_usdc",
      referenceAssetId: "asset_usd",
      rate: 1,
      asOf: 100,
      source: "oracle",
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/economics/valuations");
    expect((captured[0].body as Record<string, unknown>).referenceAssetId).toBe("asset_usd");
  });

  it("listCompensationValuations -> GET /economics/valuations?referenceAssetId=", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listCompensationValuations("asset_usd");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/economics/valuations?referenceAssetId=asset_usd");
  });

  it("quoteCompensationInReference -> POST /economics/quote-reference", async () => {
    const { sdk, captured } = createMockSdk({ referenceAssetId: "asset_usd" });
    await sdk.quoteCompensationInReference(model, "asset_usd");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/economics/quote-reference");
    expect((captured[0].body as Record<string, unknown>).referenceAssetId).toBe("asset_usd");
  });

  it("planCompensationSettlement -> POST /economics/settlement-plan", async () => {
    const { sdk, captured } = createMockSdk({ id: "plan_1", lines: [] });
    await sdk.planCompensationSettlement(model);

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/economics/settlement-plan");
    expect((captured[0].body as Record<string, unknown>).legs).toBeDefined();
  });
});

describe("PactSdk - Batch 6 - Dev", () => {
  it("listPolicies -> GET /dev/policies", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listPolicies();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/dev/policies");
  });
});
