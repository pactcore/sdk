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

describe("PactSdk - Batch 10 - Economics reconciliation", () => {
  it("getEconomicsConnectorHealth -> GET /economics/connectors/health", async () => {
    const { sdk, captured } = createMockSdk([
      { connector: "llm_token_metering", rail: "llm_metering", state: "healthy" },
    ]);

    await sdk.getEconomicsConnectorHealth();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/economics/connectors/health");
  });

  it("runReconciliationCycle -> POST /economics/reconciliation/run", async () => {
    const { sdk, captured } = createMockSdk({
      reconciledRecordCount: 3,
      pendingRecordCount: 0,
    });

    await sdk.runReconciliationCycle();

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/economics/reconciliation/run");
    expect(captured[0].body).toBeUndefined();
  });

  it("listUnreconciledSettlements -> GET /economics/reconciliation/unreconciled", async () => {
    const { sdk, captured } = createMockSdk([{ settlementId: "settlement-api-reconcile" }]);

    await sdk.listUnreconciledSettlements();

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/economics/reconciliation/unreconciled");
  });
});

describe("PactSdk - Batch 10 - Governance", () => {
  it("createGovernanceProposal -> POST /governance/proposals", async () => {
    const { sdk, captured } = createMockSdk({ id: "proposal_1", status: "active" });

    await sdk.createGovernanceProposal({
      proposerId: "council-1",
      title: "Enable rewards sync",
      description: "Roll out epoch sync to production simulations",
      quorum: 1,
      votingStartsAt: 100,
      votingEndsAt: 200,
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/governance/proposals");
    expect((captured[0].body as Record<string, unknown>).proposerId).toBe("council-1");
    expect((captured[0].body as Record<string, unknown>).votingEndsAt).toBe(200);
  });

  it("voteOnGovernanceProposal -> POST /governance/proposals/:id/vote", async () => {
    const { sdk, captured } = createMockSdk({ id: "proposal_1", forVotes: 1 });

    await sdk.voteOnGovernanceProposal("proposal_1", {
      voterId: "delegate-1",
      support: true,
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/governance/proposals/proposal_1/vote");
    expect((captured[0].body as Record<string, unknown>).voterId).toBe("delegate-1");
    expect((captured[0].body as Record<string, unknown>).support).toBe(true);
  });

  it("executeGovernanceProposal -> POST /governance/proposals/:id/execute", async () => {
    const { sdk, captured } = createMockSdk({ id: "proposal_1", status: "executed" });

    await sdk.executeGovernanceProposal("proposal_1", { executorId: "multisig-1" });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/governance/proposals/proposal_1/execute");
    expect((captured[0].body as Record<string, unknown>).executorId).toBe("multisig-1");
  });
});

describe("PactSdk - Batch 10 - Rewards", () => {
  it("distributeEpochRewards -> POST /rewards/epochs/:epoch/distribute", async () => {
    const { sdk, captured } = createMockSdk({ epoch: 11, totalAmountCents: 1500 });

    await sdk.distributeEpochRewards(11, {
      distributions: [
        { participantId: "worker-1", amountCents: 1100 },
        { participantId: "worker-2", amountCents: 400 },
      ],
    });

    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/rewards/epochs/11/distribute");
    expect(((captured[0].body as Record<string, unknown>).distributions as Array<Record<string, unknown>>)[0]?.participantId).toBe("worker-1");
    expect(((captured[0].body as Record<string, unknown>).distributions as Array<Record<string, unknown>>)[1]?.amountCents).toBe(400);
  });

  it("getParticipantRewards -> GET /rewards/:participantId", async () => {
    const { sdk, captured } = createMockSdk({ participantId: "worker-1", totalRewardsCents: 1100 });

    await sdk.getParticipantRewards("worker-1");

    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/rewards/worker-1");
  });
});
