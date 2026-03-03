import type { AgentMission, MissionEvidenceInput, WorkerRuntimeReport } from "./types";

export interface MissionSource {
  claimNextMission(agentId: string): Promise<AgentMission | undefined>;
  submitEvidence(missionId: string, evidence: MissionEvidenceInput): Promise<void>;
}

export interface WorkerRuntimePolicy {
  canClaim(mission: AgentMission): boolean;
  canSubmitEvidence(mission: AgentMission, evidence: MissionEvidenceInput): boolean;
}

export interface WorkerRuntimeHandlers {
  executeMission(mission: AgentMission): Promise<MissionEvidenceInput | undefined>;
  onMissionClaimed?(mission: AgentMission): Promise<void> | void;
  onMissionSubmitted?(mission: AgentMission, evidence: MissionEvidenceInput): Promise<void> | void;
  onMissionFailed?(mission: AgentMission, error: unknown): Promise<void> | void;
}

export interface WorkerRuntimeOptions {
  agentId: string;
  missionSource: MissionSource;
  policy: WorkerRuntimePolicy;
  handlers: WorkerRuntimeHandlers;
}

export class WorkerRuntime {
  constructor(private readonly options: WorkerRuntimeOptions) {}

  async runOnce(): Promise<WorkerRuntimeReport> {
    const mission = await this.options.missionSource.claimNextMission(this.options.agentId);
    if (!mission) {
      return {
        missionId: "",
        outcome: "skipped",
        reason: "no_mission_available",
      };
    }

    if (!this.options.policy.canClaim(mission)) {
      return {
        missionId: mission.id,
        outcome: "skipped",
        reason: "policy_denied_claim",
      };
    }

    try {
      await this.options.handlers.onMissionClaimed?.(mission);

      const evidence = await this.options.handlers.executeMission(mission);
      if (!evidence) {
        return {
          missionId: mission.id,
          outcome: "skipped",
          reason: "no_evidence_generated",
        };
      }

      if (!this.options.policy.canSubmitEvidence(mission, evidence)) {
        return {
          missionId: mission.id,
          outcome: "failed",
          reason: "policy_denied_submit",
        };
      }

      await this.options.missionSource.submitEvidence(mission.id, evidence);
      await this.options.handlers.onMissionSubmitted?.(mission, evidence);

      return {
        missionId: mission.id,
        outcome: "submitted",
      };
    } catch (error) {
      await this.options.handlers.onMissionFailed?.(mission, error);
      return {
        missionId: mission.id,
        outcome: "failed",
        reason: error instanceof Error ? error.message : "runtime_error",
      };
    }
  }
}

export function createWorkerRuntime(options: WorkerRuntimeOptions): WorkerRuntime {
  return new WorkerRuntime(options);
}

export function allowAllWorkerRuntimePolicy(): WorkerRuntimePolicy {
  return {
    canClaim: () => true,
    canSubmitEvidence: () => true,
  };
}
