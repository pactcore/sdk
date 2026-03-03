import { describe, expect, it } from "bun:test";
import {
  InMemoryWorkerRuntimeCheckpointStore,
  allowAllWorkerRuntimePolicy,
  createWorkerRuntime,
} from "../src/worker-runtime";
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

  it("runs loop with event cursor and checkpoint persistence", async () => {
    const checkpointStore = new InMemoryWorkerRuntimeCheckpointStore();
    let missionClaimed = false;

    const runtime = createWorkerRuntime({
      agentId: "agent-loop",
      missionSource: {
        claimNextMission: async () => {
          if (missionClaimed) {
            return undefined;
          }
          missionClaimed = true;
          return {
            id: "mission-loop-1",
            title: "Loop Mission",
            status: "Open",
            objective: "do loop work",
            constraints: [],
            successCriteria: [],
          };
        },
        submitEvidence: async () => {},
      },
      eventFeed: {
        poll: async (fromCursor) =>
          fromCursor === 0
            ? [
                { cursor: 0, topic: "mission.available", payload: { missionId: "m-1" } },
                { cursor: 1, topic: "mission.updated", payload: { missionId: "m-1" } },
              ]
            : [],
      },
      checkpointStore,
      policy: allowAllWorkerRuntimePolicy(),
      handlers: {
        executeMission: async () => ({
          summary: "loop-done",
          artifactUris: ["ipfs://loop"],
          bundleHash: "sha256:loop",
        }),
      },
    });

    const report = await runtime.runLoop({ iterations: 2 });
    expect(report.iterations).toBe(2);
    expect(report.processedEvents).toBe(2);
    expect(report.cursor).toBe(2);
    expect(report.submitted).toBe(1);
    expect(report.skipped).toBe(1);

    const checkpoint = await checkpointStore.load("agent-loop");
    expect(checkpoint?.cursor).toBe(2);
    expect(checkpoint?.runs).toBe(2);
    expect(checkpoint?.submitted).toBe(1);
  });
});
