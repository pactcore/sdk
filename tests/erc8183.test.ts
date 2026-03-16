import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client";
import type { FetchLike } from "../src/client";
import type {
  CommitteeSession,
  CommitteeStatus,
  CommitteeVote,
  CommitteeConfig,
  DisputeCase,
  DisputeStatus,
  JuryExpiry,
  JurySession,
  JurySessionStatus,
  OpenDisputeInput,
  RequestJuryPanelInput,
  SettlementBreakdown,
  SettlementSplit,
  TriggerValidationResult,
  ValidationLayer,
  ValidationPipelineConfig,
} from "../src/types";

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

// ── DisputeStatus type coverage ──────────────────────────────────

describe("ERC-8183: DisputeStatus extended values", () => {
  it("accepts 'expired' as a valid DisputeStatus", () => {
    const status: DisputeStatus = "expired";
    expect(status).toBe("expired");
  });

  it("accepts 'committee_review' as a valid DisputeStatus", () => {
    const status: DisputeStatus = "committee_review";
    expect(status).toBe("committee_review");
  });

  it("existing statuses remain valid", () => {
    const statuses: DisputeStatus[] = ["open", "evidence", "jury_vote", "resolved", "expired", "committee_review"];
    expect(statuses).toHaveLength(6);
  });
});

// ── DisputeCase ERC-8183 fields ───────────────────────────────────

describe("ERC-8183: DisputeCase bond and deadline fields", () => {
  it("constructs DisputeCase with ERC-8183 fields", () => {
    const dispute: DisputeCase = {
      id: "dispute_1",
      missionId: "mission_1",
      challengerId: "challenger_1",
      respondentId: "respondent_1",
      status: "evidence",
      evidence: [],
      juryVotes: [],
      createdAt: 1700000000000,
      bondAmountCents: 5000,
      bondStatus: "locked",
      bondUnit: "USDC",
      bondAsset: "usdc",
      evidenceDeadlineAt: 1700003600000,
      votingDeadlineAt: 1700007200000,
      subjectType: "task",
      subjectRef: "task_abc",
      evidenceHash: "sha256:abc123",
    };

    expect(dispute.bondAmountCents).toBe(5000);
    expect(dispute.bondStatus).toBe("locked");
    expect(dispute.bondUnit).toBe("USDC");
    expect(dispute.bondAsset).toBe("usdc");
    expect(dispute.evidenceDeadlineAt).toBe(1700003600000);
    expect(dispute.votingDeadlineAt).toBe(1700007200000);
    expect(dispute.subjectType).toBe("task");
    expect(dispute.subjectRef).toBe("task_abc");
    expect(dispute.evidenceHash).toBe("sha256:abc123");
  });

  it("DisputeCase ERC-8183 fields are optional", () => {
    const dispute: DisputeCase = {
      id: "dispute_2",
      missionId: "mission_2",
      challengerId: "challenger_2",
      respondentId: "respondent_2",
      status: "open",
      evidence: [],
      juryVotes: [],
      createdAt: 1700000000000,
    };

    expect(dispute.bondAmountCents).toBeUndefined();
    expect(dispute.bondStatus).toBeUndefined();
  });
});

// ── CommitteeVote / CommitteeConfig / CommitteeSession types ──────

describe("ERC-8183: Committee types", () => {
  it("CommitteeStatus covers all four values", () => {
    const statuses: CommitteeStatus[] = ["voting", "decided", "deadlocked", "expired"];
    expect(statuses).toHaveLength(4);
  });

  it("constructs a CommitteeVote", () => {
    const vote: CommitteeVote = {
      memberId: "member_1",
      vote: "approve",
      reasoning: "meets criteria",
      votedAt: 1700000000000,
    };
    expect(vote.vote).toBe("approve");
    expect(vote.reasoning).toBe("meets criteria");
  });

  it("CommitteeVote reasoning is optional", () => {
    const vote: CommitteeVote = {
      memberId: "member_2",
      vote: "reject",
      votedAt: 1700000001000,
    };
    expect(vote.reasoning).toBeUndefined();
  });

  it("constructs a CommitteeConfig", () => {
    const config: CommitteeConfig = {
      quorumPercent: 66,
      maxDurationHours: 24,
      memberIds: ["m1", "m2", "m3"],
      tieBreaker: "reject",
    };
    expect(config.quorumPercent).toBe(66);
    expect(config.memberIds).toHaveLength(3);
    expect(config.tieBreaker).toBe("reject");
  });

  it("constructs a CommitteeSession", () => {
    const session: CommitteeSession = {
      id: "cs_1",
      disputeId: "dispute_1",
      status: "voting",
      config: {
        quorumPercent: 51,
        maxDurationHours: 48,
        memberIds: ["m1", "m2"],
      },
      votes: [],
      createdAt: 1700000000000,
      expiresAt: 1700172800000,
    };
    expect(session.status).toBe("voting");
    expect(session.decision).toBeUndefined();
    expect(session.decidedAt).toBeUndefined();
  });
});

// ── SettlementSplit / SettlementBreakdown types ───────────────────

describe("ERC-8183: Settlement split types", () => {
  it("constructs a SettlementSplit", () => {
    const split: SettlementSplit = {
      workerPct: 70,
      validatorPct: 15,
      treasuryPct: 10,
      issuerPct: 5,
    };
    const total = split.workerPct + split.validatorPct + split.treasuryPct + split.issuerPct;
    expect(total).toBe(100);
  });

  it("constructs a SettlementBreakdown", () => {
    const breakdown: SettlementBreakdown = {
      settlementId: "settle_1",
      totalAmountCents: 10000,
      split: { workerPct: 70, validatorPct: 15, treasuryPct: 10, issuerPct: 5 },
      amounts: [
        { party: "worker_1", role: "worker", amountCents: 7000, pct: 70 },
        { party: "validator_1", role: "validator", amountCents: 1500, pct: 15 },
        { party: "treasury", role: "treasury", amountCents: 1000, pct: 10 },
        { party: "issuer_1", role: "issuer", amountCents: 500, pct: 5 },
      ],
      computedAt: 1700000000000,
    };
    expect(breakdown.amounts).toHaveLength(4);
    expect(breakdown.amounts[0]?.amountCents).toBe(7000);
    const sumCents = breakdown.amounts.reduce((s, a) => s + a.amountCents, 0);
    expect(sumCents).toBe(10000);
  });
});

// ── ValidationPipelineConfig types ───────────────────────────────

describe("ERC-8183: Validation pipeline types", () => {
  it("ValidationLayer covers all three values", () => {
    const layers: ValidationLayer[] = ["AutoAI", "CommitteeReview", "HumanJury"];
    expect(layers).toHaveLength(3);
  });

  it("constructs a ValidationPipelineConfig", () => {
    const config: ValidationPipelineConfig = {
      taskId: "task_1",
      layers: ["AutoAI", "CommitteeReview"],
      committeeReview: {
        enabled: true,
        quorumPercent: 51,
        maxDurationHours: 24,
      },
      autoAIThreshold: 0.85,
      requireAllLayers: false,
    };
    expect(config.layers).toHaveLength(2);
    expect(config.committeeReview?.enabled).toBe(true);
    expect(config.autoAIThreshold).toBe(0.85);
  });

  it("ValidationPipelineConfig fields are optional", () => {
    const config: ValidationPipelineConfig = {
      layers: ["AutoAI"],
    };
    expect(config.taskId).toBeUndefined();
    expect(config.committeeReview).toBeUndefined();
    expect(config.requireAllLayers).toBeUndefined();
  });
});

// ── JurySession / JurorSelection / JuryExpiry types ───────────────

describe("ERC-8183: Jury types", () => {
  it("JurySessionStatus covers all four values", () => {
    const statuses: JurySessionStatus[] = ["forming", "deliberating", "decided", "expired"];
    expect(statuses).toHaveLength(4);
  });

  it("constructs a JurySession", () => {
    const session: JurySession = {
      id: "jury_1",
      disputeId: "dispute_1",
      status: "forming",
      jurors: [
        { jurorId: "juror_1", selectedAt: 1700000000000, stake: 100 },
        { jurorId: "juror_2", selectedAt: 1700000001000 },
      ],
      votes: [],
      createdAt: 1700000000000,
      expiresAt: 1700086400000,
    };
    expect(session.jurors).toHaveLength(2);
    expect(session.jurors[0]?.stake).toBe(100);
    expect(session.jurors[1]?.stake).toBeUndefined();
    expect(session.decidedAt).toBeUndefined();
  });

  it("constructs a JuryExpiry", () => {
    const expiry: JuryExpiry = {
      sessionId: "jury_1",
      disputeId: "dispute_1",
      expiredAt: 1700086400000,
      reason: "deadline reached",
    };
    expect(expiry.reason).toBe("deadline reached");
  });
});

// ── Client method: openDispute ────────────────────────────────────

describe("ERC-8183: openDispute client method", () => {
  it("POST /disputes/open with bond fields", async () => {
    const { sdk, captured } = createMockSdk({
      id: "dispute_1",
      missionId: "mission_1",
      challengerId: "challenger_1",
      respondentId: "respondent_1",
      status: "evidence",
      evidence: [],
      juryVotes: [],
      createdAt: 1700000000000,
      bondAmountCents: 5000,
      bondStatus: "locked",
      bondUnit: "USDC",
      bondAsset: "usdc",
    });

    const input: OpenDisputeInput = {
      missionId: "mission_1",
      challengerId: "challenger_1",
      initialEvidence: { description: "evidence desc", artifactUris: ["ipfs://abc"] },
      bondAmountCents: 5000,
      bondAsset: "usdc",
      subjectType: "task",
      subjectRef: "task_1",
    };

    const result = await sdk.openDispute(input);

    expect(result.bondAmountCents).toBe(5000);
    expect(result.bondStatus).toBe("locked");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/open");
    expect((captured[0]?.body as Record<string, unknown>).bondAmountCents).toBe(5000);
    expect((captured[0]?.body as Record<string, unknown>).subjectType).toBe("task");
  });
});

// ── Client method: closeEvidencePeriod ───────────────────────────

describe("ERC-8183: closeEvidencePeriod client method", () => {
  it("POST /disputes/:id/close-evidence", async () => {
    const { sdk, captured } = createMockSdk({
      id: "dispute_1",
      missionId: "mission_1",
      challengerId: "c1",
      respondentId: "r1",
      status: "jury_vote",
      evidence: [],
      juryVotes: [],
      createdAt: 1700000000000,
    });

    const result = await sdk.closeEvidencePeriod("dispute_1");

    expect(result.status).toBe("jury_vote");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/dispute_1/close-evidence");
  });
});

// ── Client method: expireDispute ──────────────────────────────────

describe("ERC-8183: expireDispute client method", () => {
  it("POST /disputes/:id/expire", async () => {
    const { sdk, captured } = createMockSdk({
      id: "dispute_1",
      missionId: "mission_1",
      challengerId: "c1",
      respondentId: "r1",
      status: "expired",
      evidence: [],
      juryVotes: [],
      createdAt: 1700000000000,
    });

    const result = await sdk.expireDispute("dispute_1");

    expect(result.status).toBe("expired");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/dispute_1/expire");
  });
});

// ── Client method: createCommitteeSession ────────────────────────

describe("ERC-8183: createCommitteeSession client method", () => {
  it("POST /disputes/committee/sessions", async () => {
    const { sdk, captured } = createMockSdk({
      id: "cs_1",
      disputeId: "dispute_1",
      status: "voting",
      config: { quorumPercent: 51, maxDurationHours: 24, memberIds: ["m1", "m2"] },
      votes: [],
      createdAt: 1700000000000,
      expiresAt: 1700086400000,
    });

    const result = await sdk.createCommitteeSession({
      disputeId: "dispute_1",
      config: {
        quorumPercent: 51,
        maxDurationHours: 24,
        memberIds: ["m1", "m2"],
      },
    });

    expect(result.id).toBe("cs_1");
    expect(result.status).toBe("voting");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/committee/sessions");
    expect((captured[0]?.body as Record<string, unknown>).disputeId).toBe("dispute_1");
  });
});

// ── Client method: submitCommitteeVote ───────────────────────────

describe("ERC-8183: submitCommitteeVote client method", () => {
  it("POST /disputes/committee/sessions/:id/vote", async () => {
    const { sdk, captured } = createMockSdk({
      id: "cs_1",
      disputeId: "dispute_1",
      status: "decided",
      config: { quorumPercent: 51, maxDurationHours: 24, memberIds: ["m1", "m2"] },
      votes: [{ memberId: "m1", vote: "approve", votedAt: 1700000001000 }],
      decision: "approve",
      createdAt: 1700000000000,
      expiresAt: 1700086400000,
      decidedAt: 1700000001000,
    });

    const result = await sdk.submitCommitteeVote("cs_1", {
      memberId: "m1",
      vote: "approve",
      reasoning: "looks good",
    });

    expect(result.status).toBe("decided");
    expect(result.decision).toBe("approve");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/committee/sessions/cs_1/vote");
    expect((captured[0]?.body as Record<string, unknown>).vote).toBe("approve");
  });
});

// ── Client method: getCommitteeSession ───────────────────────────

describe("ERC-8183: getCommitteeSession client method", () => {
  it("GET /disputes/committee/sessions/:id", async () => {
    const { sdk, captured } = createMockSdk({
      id: "cs_1",
      disputeId: "dispute_1",
      status: "voting",
      config: { quorumPercent: 66, maxDurationHours: 48, memberIds: ["m1", "m2", "m3"] },
      votes: [],
      createdAt: 1700000000000,
      expiresAt: 1700172800000,
    });

    const result = await sdk.getCommitteeSession("cs_1");

    expect(result.id).toBe("cs_1");
    expect(result.config.memberIds).toHaveLength(3);
    expect(captured[0]?.method).toBe("GET");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/committee/sessions/cs_1");
  });
});

// ── Client method: getSettlementSplits ───────────────────────────

describe("ERC-8183: getSettlementSplits client method", () => {
  it("GET /economics/settlements/:id/splits", async () => {
    const { sdk, captured } = createMockSdk({
      workerPct: 70,
      validatorPct: 15,
      treasuryPct: 10,
      issuerPct: 5,
    });

    const result = await sdk.getSettlementSplits("settle_1");

    expect(result.workerPct).toBe(70);
    expect(result.validatorPct).toBe(15);
    expect(result.treasuryPct).toBe(10);
    expect(result.issuerPct).toBe(5);
    expect(captured[0]?.method).toBe("GET");
    expect(captured[0]?.url).toBe("https://api.pact/economics/settlements/settle_1/splits");
  });
});

// ── Client method: getSettlementBreakdown ────────────────────────

describe("ERC-8183: getSettlementBreakdown client method", () => {
  it("GET /economics/settlements/:id/breakdown", async () => {
    const { sdk, captured } = createMockSdk({
      settlementId: "settle_1",
      totalAmountCents: 20000,
      split: { workerPct: 70, validatorPct: 15, treasuryPct: 10, issuerPct: 5 },
      amounts: [
        { party: "worker_1", role: "worker", amountCents: 14000, pct: 70 },
        { party: "validator_1", role: "validator", amountCents: 3000, pct: 15 },
        { party: "treasury", role: "treasury", amountCents: 2000, pct: 10 },
        { party: "issuer_1", role: "issuer", amountCents: 1000, pct: 5 },
      ],
      computedAt: 1700000000000,
    });

    const result = await sdk.getSettlementBreakdown("settle_1");

    expect(result.settlementId).toBe("settle_1");
    expect(result.totalAmountCents).toBe(20000);
    expect(result.amounts).toHaveLength(4);
    expect(result.amounts[0]?.role).toBe("worker");
    expect(result.split.workerPct).toBe(70);
    expect(captured[0]?.method).toBe("GET");
    expect(captured[0]?.url).toBe("https://api.pact/economics/settlements/settle_1/breakdown");
  });
});

// ── Client method: requestJuryPanel ──────────────────────────────

describe("ERC-8183: requestJuryPanel client method", () => {
  it("POST /disputes/jury/sessions", async () => {
    const { sdk, captured } = createMockSdk({
      id: "jury_1",
      disputeId: "dispute_1",
      status: "forming",
      jurors: [],
      votes: [],
      createdAt: 1700000000000,
      expiresAt: 1700086400000,
    });

    const input: RequestJuryPanelInput = {
      disputeId: "dispute_1",
      jurorCount: 5,
      minStake: 100,
      expiresInHours: 24,
    };

    const result = await sdk.requestJuryPanel(input);

    expect(result.id).toBe("jury_1");
    expect(result.status).toBe("forming");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/jury/sessions");
    expect((captured[0]?.body as Record<string, unknown>).jurorCount).toBe(5);
    expect((captured[0]?.body as Record<string, unknown>).minStake).toBe(100);
  });
});

// ── Client method: castJuryVote ───────────────────────────────────

describe("ERC-8183: castJuryVote client method", () => {
  it("POST /disputes/jury/sessions/:id/vote", async () => {
    const { sdk, captured } = createMockSdk({
      id: "jury_1",
      disputeId: "dispute_1",
      status: "deliberating",
      jurors: [{ jurorId: "juror_1", selectedAt: 1700000000000 }],
      votes: [{ jurorId: "juror_1", vote: "uphold", reasoning: "valid claim", votedAt: 1700000001000 }],
      createdAt: 1700000000000,
      expiresAt: 1700086400000,
    });

    const result = await sdk.castJuryVote("jury_1", {
      jurorId: "juror_1",
      vote: "uphold",
      reasoning: "valid claim",
    });

    expect(result.status).toBe("deliberating");
    expect(result.votes).toHaveLength(1);
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/jury/sessions/jury_1/vote");
    expect((captured[0]?.body as Record<string, unknown>).vote).toBe("uphold");
  });
});

// ── Client method: expireJurySession ─────────────────────────────

describe("ERC-8183: expireJurySession client method", () => {
  it("POST /disputes/jury/sessions/:id/expire", async () => {
    const { sdk, captured } = createMockSdk({
      sessionId: "jury_1",
      disputeId: "dispute_1",
      expiredAt: 1700086400000,
      reason: "deadline reached",
    });

    const result: JuryExpiry = await sdk.expireJurySession("jury_1");

    expect(result.sessionId).toBe("jury_1");
    expect(result.reason).toBe("deadline reached");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/disputes/jury/sessions/jury_1/expire");
  });
});

// ── Client method: getValidationPipelineConfig ───────────────────

describe("ERC-8183: getValidationPipelineConfig client method", () => {
  it("GET /tasks/:id/validation/config", async () => {
    const { sdk, captured } = createMockSdk({
      taskId: "task_1",
      layers: ["AutoAI", "CommitteeReview"],
      committeeReview: {
        enabled: true,
        quorumPercent: 51,
        maxDurationHours: 24,
      },
      autoAIThreshold: 0.9,
      requireAllLayers: false,
    });

    const result: ValidationPipelineConfig = await sdk.getValidationPipelineConfig("task_1");

    expect(result.taskId).toBe("task_1");
    expect(result.layers).toContain("AutoAI");
    expect(result.layers).toContain("CommitteeReview");
    expect(result.committeeReview?.enabled).toBe(true);
    expect(result.autoAIThreshold).toBe(0.9);
    expect(captured[0]?.method).toBe("GET");
    expect(captured[0]?.url).toBe("https://api.pact/tasks/task_1/validation/config");
  });
});

// ── Client method: triggerValidation ─────────────────────────────

describe("ERC-8183: triggerValidation client method", () => {
  it("POST /validation/trigger with AutoAI layer", async () => {
    const { sdk, captured } = createMockSdk({
      validationId: "val_1",
      layer: "AutoAI",
      status: "running",
      triggeredAt: 1700000000000,
    });

    const result: TriggerValidationResult = await sdk.triggerValidation({
      taskId: "task_1",
      layer: "AutoAI",
      context: { model: "gpt-4" },
    });

    expect(result.validationId).toBe("val_1");
    expect(result.layer).toBe("AutoAI");
    expect(result.status).toBe("running");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/validation/trigger");
    expect((captured[0]?.body as Record<string, unknown>).layer).toBe("AutoAI");
  });

  it("POST /validation/trigger with HumanJury layer", async () => {
    const { sdk, captured } = createMockSdk({
      validationId: "val_2",
      layer: "HumanJury",
      status: "pending",
      triggeredAt: 1700000001000,
    });

    const result: TriggerValidationResult = await sdk.triggerValidation({
      missionId: "mission_1",
      layer: "HumanJury",
    });

    expect(result.layer).toBe("HumanJury");
    expect(result.status).toBe("pending");
    expect(captured[0]?.method).toBe("POST");
    expect(captured[0]?.url).toBe("https://api.pact/validation/trigger");
    expect((captured[0]?.body as Record<string, unknown>).missionId).toBe("mission_1");
  });

  it("TriggerValidationResult status covers all states", () => {
    const statuses: TriggerValidationResult["status"][] = [
      "pending",
      "running",
      "passed",
      "failed",
      "escalated",
    ];
    expect(statuses).toHaveLength(5);
  });
});
