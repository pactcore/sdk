import { describe, expect, it } from "bun:test";
import { allowAllWorkerRuntimePolicy, createWorkerRuntime } from "../src/worker-runtime";
import type { AgentMission, MissionEvidenceInput } from "../src/types";

describe("WorkerRuntime", () => {
  it("claims mission and submits evidence", async () => {
    const submitted: Array<{ missionId: string; evidence: MissionEvidenceInput }> = [];

    const mission: AgentMission = {
      id: "mission-1",
      title: "Classify images",
      status: "Open",
      objective: "label assets",
      constraints: ["no pii"],
      successCriteria: ["deterministic output"],
    };

    const runtime = createWorkerRuntime({
      agentId: "agent-1",
      missionSource: {
        claimNextMission: async () => mission,
        submitEvidence: async (missionId, evidence) => {
          submitted.push({ missionId, evidence });
        },
      },
      policy: allowAllWorkerRuntimePolicy(),
      handlers: {
        executeMission: async () => ({
          summary: "done",
          artifactUris: ["ipfs://result"],
          bundleHash: "sha256:bundle",
        }),
      },
    });

    const result = await runtime.runOnce();

    expect(result.outcome).toBe("submitted");
    expect(submitted.length).toBe(1);
    expect(submitted[0]?.missionId).toBe("mission-1");
  });

  it("skips when no mission is available", async () => {
    const runtime = createWorkerRuntime({
      agentId: "agent-1",
      missionSource: {
        claimNextMission: async () => undefined,
        submitEvidence: async () => {},
      },
      policy: allowAllWorkerRuntimePolicy(),
      handlers: {
        executeMission: async () => ({
          summary: "done",
          artifactUris: [],
          bundleHash: "sha256:bundle",
        }),
      },
    });

    const result = await runtime.runOnce();
    expect(result.outcome).toBe("skipped");
    expect(result.reason).toBe("no_mission_available");
  });

  it("fails when policy denies evidence submission", async () => {
    const runtime = createWorkerRuntime({
      agentId: "agent-1",
      missionSource: {
        claimNextMission: async () => ({
          id: "mission-2",
          title: "Task",
          status: "Open",
          objective: "obj",
          constraints: [],
          successCriteria: [],
        }),
        submitEvidence: async () => {
          throw new Error("should not submit");
        },
      },
      policy: {
        canClaim: () => true,
        canSubmitEvidence: () => false,
      },
      handlers: {
        executeMission: async () => ({
          summary: "done",
          artifactUris: ["ipfs://x"],
          bundleHash: "sha256:y",
        }),
      },
    });

    const result = await runtime.runOnce();
    expect(result.outcome).toBe("failed");
    expect(result.reason).toBe("policy_denied_submit");
  });
});
