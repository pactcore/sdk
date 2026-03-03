export type ParticipantRole = "worker" | "validator" | "issuer" | "developer" | "buyer" | "agent";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RegisterParticipantInput {
  id: string;
  role: ParticipantRole;
  displayName: string;
  skills?: string[];
  capacity?: number;
  initialReputation?: number;
  location?: GeoPoint;
}

export interface TaskConstraints {
  requiredSkills?: string[];
  maxDistanceKm?: number;
  minReputation?: number;
}

export interface CreateTaskInput {
  id: string;
  issuerId: string;
  description: string;
  paymentCents: number;
  constraints?: TaskConstraints;
}

export interface SubmitTaskInput {
  evidence: {
    uri: string;
    checksum?: string;
    notes?: string;
  };
}

export interface Task {
  id: string;
  issuerId: string;
  assigneeId?: string;
  status: "Created" | "Assigned" | "Submitted" | "Verified" | "Completed";
  paymentCents: number;
}

export interface HealthResponse {
  ok: boolean;
  service?: string;
}

export type MissionStatus =
  | "Open"
  | "Claimed"
  | "InProgress"
  | "UnderReview"
  | "Settled"
  | "Failed";

export interface AgentMission {
  id: string;
  title: string;
  status: MissionStatus;
  objective: string;
  constraints: string[];
  successCriteria: string[];
}

export interface MissionEvidenceInput {
  summary: string;
  artifactUris: string[];
  bundleHash: string;
}

export interface WorkerRuntimeReport {
  missionId: string;
  outcome: "submitted" | "skipped" | "failed";
  reason?: string;
}
