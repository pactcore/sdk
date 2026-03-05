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
  compensation?: {
    mode: "single_asset" | "multi_asset";
    legs: Array<{
      assetId: string;
      amount: number;
      unit: string;
      payerId: string;
      payeeId: string;
    }>;
  };
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

export interface MissionEvent {
  cursor: number;
  topic: string;
  payload: unknown;
  createdAt?: number;
}

export interface WorkerRuntimeCheckpoint {
  agentId: string;
  cursor: number;
  runs: number;
  submitted: number;
  skipped: number;
  failed: number;
  updatedAt: number;
  lastMissionId?: string;
}

export interface WorkerRuntimeLoopReport {
  iterations: number;
  cursor: number;
  submitted: number;
  skipped: number;
  failed: number;
  processedEvents: number;
}

// ── PactCompute types ──────────────────────────────────────────

export interface ComputeProviderCapabilities {
  cpuCores: number;
  memoryMB: number;
  gpuCount: number;
  gpuModel?: string;
}

export type ComputeProviderStatus = "available" | "busy" | "offline";

export interface ComputeProvider {
  id: string;
  name: string;
  capabilities: ComputeProviderCapabilities;
  pricePerCpuSecondCents: number;
  pricePerGpuSecondCents: number;
  pricePerMemoryMBHourCents: number;
  status: ComputeProviderStatus;
  registeredAt: number;
}

export interface ComputeUsageRecord {
  id: string;
  jobId: string;
  providerId: string;
  cpuSeconds: number;
  memoryMBHours: number;
  gpuSeconds: number;
  totalCostCents: number;
  recordedAt: number;
}

export interface ComputeJobResult {
  jobId: string;
  providerId: string;
  status: "completed" | "failed";
  output?: string;
  error?: string;
  usage: ComputeUsageRecord;
  completedAt: number;
}

export interface ComputeJobInput {
  image: string;
  command: string;
  runAt?: number;
  metadata?: Record<string, string>;
}

// ── PactID / DID types ─────────────────────────────────────────

export interface DIDVerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyHex?: string;
}

export interface DIDServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface DIDDocument {
  id: string;
  controller: string;
  verificationMethod: DIDVerificationMethod[];
  service: DIDServiceEndpoint[];
  createdAt: number;
  updatedAt: number;
}

export interface CredentialSubject {
  id: string;
  capability?: string;
  [key: string]: unknown;
}

export interface CredentialProof {
  type: string;
  created: number;
  verificationMethod: string;
  proofValue: string;
}

export interface VerifiableCredential {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: number;
  expirationDate?: number;
  credentialSubject: CredentialSubject;
  proof: CredentialProof;
}

export interface IssueCredentialInput {
  issuerId: string;
  subjectId: string;
  capability: string;
  additionalClaims?: Record<string, unknown>;
  expirationDate?: number;
}

export interface CapabilityCheckResult {
  hasCapability: boolean;
}

// ── PactData types ─────────────────────────────────────────────

export interface DataAsset {
  id: string;
  ownerId: string;
  title: string;
  uri: string;
  tags: string[];
  createdAt: number;
}

export interface PublishDataAssetInput {
  ownerId: string;
  title: string;
  uri: string;
  tags?: string[];
  derivedFrom?: string[];
}

export interface ProvenanceEdge {
  childId: string;
  parentId: string;
  relationship: string;
  createdAt: number;
}

export interface IntegrityProof {
  assetId: string;
  algorithm: string;
  hash: string;
  provenAt: number;
}

export interface DataAccessPolicy {
  assetId: string;
  allowedParticipantIds: string[];
  isPublic: boolean;
}

export interface DataAccessCheckResult {
  allowed: boolean;
}

// ── PactDev types ──────────────────────────────────────────────

export type PolicyAction = "allow" | "deny" | "require_review";

export interface PolicyRule {
  id: string;
  name: string;
  condition: Record<string, unknown>;
  action: PolicyAction;
  priority: number;
  enabled: boolean;
}

export interface PolicyPackage {
  id: string;
  name: string;
  version: string;
  rules: PolicyRule[];
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  matchedRules: PolicyRule[];
  deniedBy?: PolicyRule;
}

export type DevIntegrationStatus = "draft" | "active" | "suspended" | "deprecated";

export interface DevIntegration {
  id: string;
  ownerId: string;
  name: string;
  webhookUrl: string;
  status: DevIntegrationStatus;
  createdAt: number;
}

export interface RegisterDevIntegrationInput {
  ownerId: string;
  name: string;
  webhookUrl: string;
}

export interface SDKTemplate {
  id: string;
  name: string;
  language: string;
  repoUrl: string;
  description: string;
  tags: string[];
  createdAt: number;
}

export interface RegisterSDKTemplateInput {
  name: string;
  language: string;
  repoUrl: string;
  description: string;
  tags?: string[];
}
