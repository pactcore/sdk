export type ParticipantRole = "worker" | "validator" | "issuer" | "developer" | "buyer";

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
