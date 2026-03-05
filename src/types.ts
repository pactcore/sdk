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

// ── Batch 3: Participant identity and onchain types ────────────

export type IdentityLevel = "basic" | "verified" | "trusted" | "elite";

export interface ParticipantStats {
  participantId: string;
  taskCount: number;
  completedTaskCount: number;
  reputation: number;
  hasZKProofOfHumanity: boolean;
  hasPhoneVerification: boolean;
  hasIdVerification: boolean;
}

export interface Participant {
  id: string;
  role: ParticipantRole;
  displayName: string;
  skills: string[];
  location: GeoPoint;
  identityLevel?: IdentityLevel;
  stats?: ParticipantStats;
}

export interface WorkerProfile {
  id: string;
  skills: string[];
  reputation: number;
  location: GeoPoint;
  capacity: number;
  activeTaskIds: string[];
}

export interface OnchainParticipantIdentity {
  participantId: string;
  tokenId: string;
  role: string;
  level: number;
  registeredAt: number;
}

export interface ParticipantLevelResponse {
  participantId: string;
  level: IdentityLevel;
}

export interface ParticipantLevelUpgradeResult {
  previousLevel: IdentityLevel;
  newLevel: IdentityLevel;
  participant: Participant;
}

// ── Batch 3: Payment routing types ──────────────────────────────

export interface PaymentRoute {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  currency: string;
  reference: string;
  routeType: "direct" | "swap" | "aggregated" | "credit";
  status: "pending" | "completed" | "failed";
  createdAt: number;
}

export interface RoutePaymentInput {
  fromId: string;
  toId: string;
  amount: number;
  currency?: string;
  reference?: string;
}

export interface MicropaymentBatchEntry {
  payeeId: string;
  amountCents: number;
}

export interface MicropaymentBatch {
  id: string;
  payerId: string;
  entries: MicropaymentBatchEntry[];
  totalCents: number;
  batchedAt: number;
  settledAt?: number;
}

export interface AddMicropaymentInput {
  payerId: string;
  payeeId: string;
  amountCents: number;
}

export interface MicropaymentAcceptedResponse {
  accepted: boolean;
}

export interface CreditLine {
  id: string;
  issuerId: string;
  borrowerId: string;
  limitCents: number;
  usedCents: number;
  interestBps: number;
  createdAt: number;
  expiresAt?: number;
}

export interface OpenCreditLineInput {
  issuerId: string;
  borrowerId: string;
  limitCents: number;
  interestBps: number;
}

export interface GasSponsorshipGrant {
  id: string;
  sponsorId: string;
  beneficiaryId: string;
  maxGasCents: number;
  usedGasCents: number;
  createdAt: number;
}

export interface GrantGasSponsorshipInput {
  sponsorId: string;
  beneficiaryId: string;
  maxGasCents: number;
}

// ── Batch 3: Reputation types ───────────────────────────────────

export type ReputationCategory =
  | "task_completion"
  | "verification_accuracy"
  | "payment_reliability"
  | "responsiveness"
  | "skill_expertise";

export type ReputationLevel = "newcomer" | "regular" | "established" | "expert";

export interface ReputationDimension {
  category: ReputationCategory;
  score: number;
  weight: number;
  updatedAt: number;
}

export interface ReputationEvent {
  id: string;
  participantId: string;
  category: ReputationCategory;
  delta: number;
  reason: string;
  timestamp: number;
}

export interface ReputationProfile {
  participantId: string;
  dimensions: ReputationDimension[];
  overallScore: number;
  history: ReputationEvent[];
  level: ReputationLevel;
}

export interface RecordReputationEventInput {
  category: ReputationCategory;
  delta: number;
  reason?: string;
}

// ── Batch 3: ZK proof types ─────────────────────────────────────

export type ZKProofType = "location" | "completion" | "identity" | "reputation";

export interface ZKProof {
  id: string;
  type: ZKProofType;
  proverId: string;
  commitment: string;
  publicInputs: Record<string, unknown>;
  proof: string;
  verified: boolean;
  createdAt: number;
}

export interface ZKLocationClaim {
  latitude: number;
  longitude: number;
  radius: number;
  timestamp: number;
}

export interface ZKCompletionClaim {
  taskId: string;
  evidenceHash: string;
  completedAt: number;
}

export interface ZKIdentityClaim {
  participantId: string;
  isHuman: boolean;
}

export interface ZKReputationClaim {
  participantId: string;
  minScore: number;
  actualAbove: boolean;
}

export interface CreateZKLocationProofInput {
  proverId: string;
  claim: ZKLocationClaim;
}

export interface CreateZKCompletionProofInput {
  proverId: string;
  claim: ZKCompletionClaim;
}

export interface CreateZKIdentityProofInput {
  proverId: string;
  claim: ZKIdentityClaim;
}

export interface CreateZKReputationProofInput {
  proverId: string;
  claim: ZKReputationClaim;
}

export interface ZKProofVerificationResult {
  valid: boolean;
}

// ── Batch 3: Compute pricing types ──────────────────────────────

export interface ResourceTier {
  name: string;
  cpuCores: number;
  memoryMB: number;
  gpuCount?: number;
  pricePerHourCents: number;
}

export interface ComputePricingQuote {
  tier: ResourceTier;
  estimatedCostCents: number;
}

export interface ComputePricingQuoteInput {
  capabilities: ComputeProviderCapabilities;
  durationSeconds: number;
}

// ── Batch 3: Data marketplace types ─────────────────────────────

export type DataCategory =
  | "geolocation"
  | "image_video"
  | "survey"
  | "sensor"
  | "labeled"
  | "other";

export interface DataListing {
  id: string;
  assetId: string;
  sellerId: string;
  priceCents: number;
  currency: "USDC";
  category: DataCategory;
  listedAt: number;
  active: boolean;
}

export interface RevenueDistribution {
  producerCents: number;
  validatorCents: number;
  protocolCents: number;
}

export interface DataPurchase {
  id: string;
  listingId: string;
  assetId: string;
  buyerId: string;
  priceCents: number;
  revenueDistribution: RevenueDistribution;
  purchasedAt: number;
}

export interface DataMarketplaceStats {
  totalListings: number;
  totalPurchases: number;
  totalRevenueCents: number;
}

export interface CreateDataListingInput {
  assetId: string;
  priceCents: number;
  category: DataCategory;
}

export interface PurchaseDataListingInput {
  listingId: string;
  buyerId: string;
}

// ── Batch 3: Plugin marketplace types ───────────────────────────

export interface PluginPackage {
  id: string;
  developerId: string;
  name: string;
  version: string;
  description: string;
  repositoryUrl: string;
  createdAt: number;
  updatedAt: number;
}

export interface PluginListing {
  id: string;
  packageId: string;
  developerId: string;
  priceCents: number;
  currency: "USDC";
  publishedAt: number;
  active: boolean;
}

export interface PluginListingView {
  package: PluginPackage;
  listing: PluginListing;
}

export interface PluginInstall {
  id: string;
  pluginId: string;
  packageId: string;
  installerId: string;
  installedAt: number;
}

export interface RevenueShare {
  id: string;
  pluginId: string;
  packageId: string;
  developerId: string;
  grossRevenueCents: number;
  developerPayoutCents: number;
  protocolPayoutCents: number;
  recordedAt: number;
}

export interface PublishPluginInput {
  developerId: string;
  name: string;
  version: string;
  description: string;
  repositoryUrl: string;
  priceCents: number;
}

// ── Batch 3: Observability and admin types ──────────────────────

export interface MetricLabels {
  [key: string]: string;
}

export interface LabeledMetricValue {
  labels: MetricLabels;
  value: number;
}

export interface CounterSnapshot {
  type: "counter";
  name: string;
  description?: string;
  values: LabeledMetricValue[];
  total: number;
}

export interface GaugeSnapshot {
  type: "gauge";
  name: string;
  description?: string;
  values: LabeledMetricValue[];
}

export interface HistogramBucketSnapshot {
  le: number | "+Inf";
  count: number;
}

export interface HistogramValueSnapshot {
  labels: MetricLabels;
  count: number;
  sum: number;
  min: number;
  max: number;
  average: number;
  buckets: HistogramBucketSnapshot[];
}

export interface HistogramSnapshot {
  type: "histogram";
  name: string;
  description?: string;
  buckets: number[];
  values: HistogramValueSnapshot[];
  count: number;
  sum: number;
}

export interface MetricsSnapshot {
  generatedAt: number;
  counters: CounterSnapshot[];
  gauges: GaugeSnapshot[];
  histograms: HistogramSnapshot[];
}

export type SpanStatus = "ok" | "error";
export type SpanAttributeValue = string | number | boolean | null;

export interface SpanAttributes {
  [key: string]: SpanAttributeValue;
}

export interface SpanRecord {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: SpanStatus;
  attributes: SpanAttributes;
  errorMessage?: string;
}

export interface TraceRecord {
  traceId: string;
  rootSpanId: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: SpanStatus;
  spans: SpanRecord[];
}

export interface ObservabilityHealthResponse {
  ok: boolean;
  service: string;
  uptimeMs: number;
  metricFamilies: {
    counters: number;
    gauges: number;
    histograms: number;
  };
  traces: {
    stored: number;
  };
  timestamp: number;
}

export interface ObservabilityTracesResponse {
  limit: number;
  traces: TraceRecord[];
}

export interface CreateApiKeyInput {
  ownerId: string;
  permissions?: string[];
  rateLimit?: number;
}

export interface RegisteredApiKey {
  id: string;
  key: string;
}

export interface ApiKeyInfo {
  id: string;
  ownerId: string;
  permissions: string[];
  rateLimit?: number;
}

export interface UsageStats {
  apiKeyId: string;
  requestCount: number;
  errorCount: number;
  averageLatencyMs: number;
  lastRequestAt?: number;
}

export interface OverallUsageStats {
  requestCount: number;
  errorCount: number;
  averageLatencyMs: number;
  uniqueApiKeys: number;
}

// ── Batch 4: Anti-spam types ───────────────────────────────────

export type AntiSpamAction = "task_creation" | "bid_submission" | "data_listing";

export interface AntiSpamCheckInput {
  participantId: string;
  action: AntiSpamAction;
}

export interface AntiSpamCheckResult {
  participantId: string;
  action: AntiSpamAction;
  allowed: boolean;
  retryAfterMs?: number;
  stakeCents: number;
  spamScore: number;
}

export interface AntiSpamRecordInput {
  participantId: string;
  action: AntiSpamAction;
}

export interface AntiSpamRecordResult {
  recorded: boolean;
}

export interface AntiSpamActionWindow {
  lastHour: number;
  lastDay: number;
  lastActionAt?: number;
}

export interface AntiSpamProfile {
  spamScore: number;
  recentActions: Record<AntiSpamAction, AntiSpamActionWindow>;
  stakeRequirements: Record<AntiSpamAction, number>;
}

export interface AntiSpamStakeResult {
  participantId: string;
  action: AntiSpamAction;
  stakeCents: number;
  spamScore: number;
}

// ── Batch 4: Dispute types ─────────────────────────────────────

export type DisputeStatus = "open" | "evidence" | "jury_vote" | "resolved";

export interface DisputeEvidence {
  submitterId: string;
  description: string;
  artifactUris: string[];
  submittedAt: number;
}

export interface DisputeJuryVote {
  jurorId: string;
  vote: "uphold" | "reject";
  reasoning: string;
  votedAt: number;
}

export interface DisputeVerdict {
  outcome: "upheld" | "rejected" | "split";
  penaltyBps: number;
  rewardDistribution: Record<string, number>;
}

export interface DisputeCase {
  id: string;
  missionId: string;
  challengerId: string;
  respondentId: string;
  status: DisputeStatus;
  evidence: DisputeEvidence[];
  juryVotes: DisputeJuryVote[];
  verdict?: DisputeVerdict;
  createdAt: number;
  resolvedAt?: number;
}

export interface DisputeEvidenceInput {
  description: string;
  artifactUris: string[];
}

export interface CreateDisputeInput {
  missionId: string;
  challengerId: string;
  initialEvidence: DisputeEvidenceInput;
}

export interface SubmitDisputeEvidenceInput {
  submitterId: string;
  description: string;
  artifactUris: string[];
}

export interface DisputeVoteInput {
