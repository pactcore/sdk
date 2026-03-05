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

describe("PactSdk - Final alignment - Anti-spam", () => {
  it("checkAntiSpam -> POST /anti-spam/check", async () => {
    const { sdk, captured } = createMockSdk({ allowed: true, stakeCents: 500, spamScore: 25 });
    await sdk.checkAntiSpam({ participantId: "worker_1", action: "task_creation" });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/anti-spam/check");
    expect((captured[0].body as Record<string, unknown>).participantId).toBe("worker_1");
    expect((captured[0].body as Record<string, unknown>).action).toBe("task_creation");
  });

  it("recordAntiSpamAction -> POST /anti-spam/record", async () => {
    const { sdk, captured } = createMockSdk({ recorded: true });
    await sdk.recordAntiSpamAction({ participantId: "worker_1", action: "data_listing" });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/anti-spam/record");
    expect((captured[0].body as Record<string, unknown>).participantId).toBe("worker_1");
    expect((captured[0].body as Record<string, unknown>).action).toBe("data_listing");
  });

  it("getAntiSpamProfile -> GET /anti-spam/:participantId/profile", async () => {
    const { sdk, captured } = createMockSdk({ spamScore: 42, recentActions: {}, stakeRequirements: {} });
    await sdk.getAntiSpamProfile("worker_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/anti-spam/worker_1/profile");
  });

  it("getAntiSpamStake -> GET /anti-spam/:participantId/stake/:action", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "worker_1", action: "task_creation" });
    await sdk.getAntiSpamStake("worker_1", "task_creation");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/anti-spam/worker_1/stake/task_creation");
  });
});

describe("PactSdk - Final alignment - Disputes", () => {
  it("createDispute -> POST /disputes", async () => {
    const { sdk, captured } = createMockSdk({ id: "dispute_1", status: "open" });
    await sdk.createDispute({
      missionId: "mission_1",
      challengerId: "worker_1",
      initialEvidence: {
        description: "Mismatch in submitted artifact",
        artifactUris: ["ipfs://artifact-1"],
      },
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/disputes");
    expect((captured[0].body as Record<string, unknown>).missionId).toBe("mission_1");
  });

  it("listDisputes -> GET /disputes?status=", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listDisputes("jury_vote");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/disputes?status=jury_vote");
  });

  it("getDispute -> GET /disputes/:id", async () => {
    const { sdk, captured } = createMockSdk({ id: "dispute_1" });
    await sdk.getDispute("dispute_1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/disputes/dispute_1");
  });

  it("submitDisputeEvidence -> POST /disputes/:id/evidence", async () => {
    const { sdk, captured } = createMockSdk({ id: "dispute_1", status: "evidence" });
    await sdk.submitDisputeEvidence("dispute_1", {
      submitterId: "worker_2",
      description: "Supporting logs",
      artifactUris: ["ipfs://evidence-1"],
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/disputes/dispute_1/evidence");
    expect((captured[0].body as Record<string, unknown>).submitterId).toBe("worker_2");
  });

  it("voteOnDispute -> POST /disputes/:id/vote", async () => {
    const { sdk, captured } = createMockSdk({ id: "dispute_1", status: "jury_vote" });
    await sdk.voteOnDispute("dispute_1", {
      jurorId: "jury_1",
      vote: "uphold",
      reasoning: "evidence is consistent",
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/disputes/dispute_1/vote");
    expect((captured[0].body as Record<string, unknown>).jurorId).toBe("jury_1");
    expect((captured[0].body as Record<string, unknown>).vote).toBe("uphold");
  });

  it("resolveDispute -> POST /disputes/:id/resolve", async () => {
    const { sdk, captured } = createMockSdk({ id: "dispute_1", status: "resolved" });
    await sdk.resolveDispute("dispute_1");

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/disputes/dispute_1/resolve");
    expect(captured[0].body).toEqual({});
  });
});
