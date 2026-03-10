export class WorkerRuntime {
    options;
    constructor(options) {
        this.options = options;
    }
    async runOnce() {
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
        }
        catch (error) {
            await this.options.handlers.onMissionFailed?.(mission, error);
            return {
                missionId: mission.id,
                outcome: "failed",
                reason: error instanceof Error ? error.message : "runtime_error",
            };
        }
    }
    async runLoop(options = {}) {
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
            }
            else if (result.outcome === "failed") {
                checkpoint.failed += 1;
            }
            else {
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
    async loadCheckpoint() {
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
    async persistCheckpoint(checkpoint) {
        if (!this.options.checkpointStore) {
            return;
        }
        await this.options.checkpointStore.save(checkpoint);
    }
}
export class InMemoryWorkerRuntimeCheckpointStore {
    checkpoints = new Map();
    async load(agentId) {
        const checkpoint = this.checkpoints.get(agentId);
        return checkpoint ? { ...checkpoint } : undefined;
    }
    async save(checkpoint) {
        this.checkpoints.set(checkpoint.agentId, { ...checkpoint });
    }
}
export function createWorkerRuntime(options) {
    return new WorkerRuntime(options);
}
export function allowAllWorkerRuntimePolicy() {
    return {
        canClaim: () => true,
        canSubmitEvidence: () => true,
    };
}
