import type {
  AgentMission,
  MissionEvidenceInput,
  MissionEvent,
  WorkerRuntimeCheckpoint,
  WorkerRuntimeLoopReport,
  WorkerRuntimeReport,
} from "./types";

export interface MissionSource {
  claimNextMission(agentId: string): Promise<AgentMission | undefined>;
  submitEvidence(missionId: string, evidence: MissionEvidenceInput): Promise<void>;
}

export interface MissionEventFeed {
  poll(fromCursor: number, limit?: number): Promise<MissionEvent[]>;
}

export interface WorkerRuntimeCheckpointStore {
  load(agentId: string): Promise<WorkerRuntimeCheckpoint | undefined>;
  save(checkpoint: WorkerRuntimeCheckpoint): Promise<void>;
}

export interface WorkerRuntimePolicy {
  canClaim(mission: AgentMission): boolean;
  canSubmitEvidence(mission: AgentMission, evidence: MissionEvidenceInput): boolean;
}

export interface WorkerRuntimeHandlers {
  executeMission(mission: AgentMission): Promise<MissionEvidenceInput | undefined>;
  onEventsPolled?(events: MissionEvent[]): Promise<void> | void;
  onMissionClaimed?(mission: AgentMission): Promise<void> | void;
  onMissionSubmitted?(mission: AgentMission, evidence: MissionEvidenceInput): Promise<void> | void;
  onMissionFailed?(mission: AgentMission, error: unknown): Promise<void> | void;
}

export interface WorkerRuntimeOptions {
  agentId: string;
  missionSource: MissionSource;
  policy: WorkerRuntimePolicy;
  handlers: WorkerRuntimeHandlers;
  eventFeed?: MissionEventFeed;
  checkpointStore?: WorkerRuntimeCheckpointStore;
}

export interface WorkerRuntimeLoopOptions {
  iterations?: number;
  pollLimit?: number;
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

  async runLoop(options: WorkerRuntimeLoopOptions = {}): Promise<WorkerRuntimeLoopReport> {
    const iterations = options.iterations ?? 1;
    const pollLimit = options.pollLimit ?? 50;

    const checkpoint = await this.loadCheckpoint();
    let processedEvents = 0;

    for (let i = 0; i < iterations; i++) {
      if (this.options.eventFeed) {
        const events = await this.options.eventFeed.poll(checkpoint.cursor, pollLimit);
        if (events.length > 0) {
          await this.options.handlers.onEventsPolled?.(events);
          processedEvents += events.length;
          checkpoint.cursor = Math.max(...events.map((event) => event.cursor)) + 1;
        }
      }

      const result = await this.runOnce();
      checkpoint.runs += 1;
      checkpoint.updatedAt = Date.now();
      checkpoint.lastMissionId = result.missionId || checkpoint.lastMissionId;

      if (result.outcome === "submitted") {
        checkpoint.submitted += 1;
      } else if (result.outcome === "failed") {
        checkpoint.failed += 1;
      } else {
        checkpoint.skipped += 1;
      }

      await this.persistCheckpoint(checkpoint);
    }

    return {
      iterations,
      cursor: checkpoint.cursor,
      submitted: checkpoint.submitted,
      skipped: checkpoint.skipped,
      failed: checkpoint.failed,
      processedEvents,
    };
  }

  private async loadCheckpoint(): Promise<WorkerRuntimeCheckpoint> {
    const existing = await this.options.checkpointStore?.load(this.options.agentId);
    if (existing) {
      return { ...existing };
    }

    return {
      agentId: this.options.agentId,
      cursor: 0,
      runs: 0,
      submitted: 0,
      skipped: 0,
      failed: 0,
      updatedAt: Date.now(),
    };
  }

  private async persistCheckpoint(checkpoint: WorkerRuntimeCheckpoint): Promise<void> {
    if (!this.options.checkpointStore) {
      return;
    }
    await this.options.checkpointStore.save(checkpoint);
  }
}

export class InMemoryWorkerRuntimeCheckpointStore implements WorkerRuntimeCheckpointStore {
  private readonly checkpoints = new Map<string, WorkerRuntimeCheckpoint>();

  async load(agentId: string): Promise<WorkerRuntimeCheckpoint | undefined> {
    const checkpoint = this.checkpoints.get(agentId);
    return checkpoint ? { ...checkpoint } : undefined;
  }

  async save(checkpoint: WorkerRuntimeCheckpoint): Promise<void> {
    this.checkpoints.set(checkpoint.agentId, { ...checkpoint });
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
