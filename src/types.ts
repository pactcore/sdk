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
  capacityRequired?: number;
}

export interface CreateTaskInput {
  title: string;
  issuerId: string;
  description: string;
  paymentCents: number;
  location?: GeoPoint;
  constraints?: TaskConstraints;
  stakeCents?: number;
  id?: string;
}

export interface TaskValidationVote {
  participantId: string;
  approve: boolean;
}

export interface TaskValidationEvidence {
  autoAIScore: number;
  agentVotes: TaskValidationVote[];
  humanVotes: TaskValidationVote[];
}

export interface SubmitTaskInput {
  summary: string;
  artifactUris?: string[];
  validation?: TaskValidationEvidence;
}

export interface TaskEvidence {
  summary: string;
  artifactUris: string[];
  submittedAt: number;
  validation?: TaskValidationEvidence;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  issuerId: string;
  location: GeoPoint;
  constraints: TaskConstraints;
  assigneeId?: string;
  evidence?: TaskEvidence;
  validatorIds: string[];
  status: "Created" | "Assigned" | "Submitted" | "Verified" | "Completed";
  paymentCents: number;
  createdAt: number;
  updatedAt: number;
}

export interface HealthResponse {
  ok: boolean;
  service?: string;
}

export type MaybePromise<T> = T | Promise<T>;

export type AdapterHealthState = "healthy" | "degraded" | "unhealthy";

export type AdapterDurability = "memory" | "filesystem" | "database" | "remote" | "unknown";

export interface AdapterErrorDescriptor {
  adapter: string;
  operation: string;
  code: string;
  message: string;
  retryable: boolean;
  occurredAt: number;
  details?: Record<string, string>;
}

export interface AdapterCompatibilityReport {
  compatible: boolean;
  currentVersion?: string;
  supportedVersions?: string[];
  reason?: string;
}

export interface AdapterHealthReport {
  adapter?: string;
  name?: string;
  state: AdapterHealthState;
  checkedAt?: number;
  durable?: boolean;
  durability?: AdapterDurability;
  features?: Record<string, string | number | boolean>;
  compatibility?: AdapterCompatibilityReport;
  lastError?: AdapterErrorDescriptor;
  [key: string]: unknown;
}

export interface AdapterHealthSummary {
  status: AdapterHealthState;
  checkedAt: number;
  runtimeVersion?: string;
  adapters: AdapterHealthReport[];
}

export type AdapterFeatureMap = Record<string, string | number | boolean>;

export type ManagedBackendDomain = "data" | "compute" | "dev";

export type ManagedBackendCapability = "queue" | "store" | "observability";

export type ManagedBackendMode = "local" | "remote";

export type ManagedBackendCredentialType =
  | "none"
  | "api_key"
  | "bearer"
  | "oauth2"
  | "service_account";

export interface ManagedBackendCredentialFieldSchema {
  key: string;
  required?: boolean;
  secret?: boolean;
}

export interface ManagedBackendCredentialSchema {
  type: ManagedBackendCredentialType;
  fields: ManagedBackendCredentialFieldSchema[];
}

export interface ManagedBackendProfile {
  backendId: string;
  providerId: string;
  displayName?: string;
  endpoint?: string;
  timeoutMs?: number;
  credentialSchema?: ManagedBackendCredentialSchema;
  configuredCredentialFields?: string[];
  metadata?: Record<string, string>;
}

export interface ManagedBackendProfileSummary {
  backendId: string;
  providerId: string;
  displayName?: string;
  endpoint?: string;
  timeoutMs?: number;
  credentialType: ManagedBackendCredentialType;
  configuredCredentialFields: string[];
  metadata?: Record<string, string>;
}

export type ManagedBackendFeatureFlags = AdapterFeatureMap & {
  runtimeVersion?: string;
  executionCheckpoints?: boolean;
  liveSettlement?: boolean;
  compatibilityChecks?: boolean;
};

export interface ManagedBackendHealthReport extends AdapterHealthReport {
  domain: ManagedBackendDomain;
  capability: ManagedBackendCapability;
  mode: ManagedBackendMode;
  features?: ManagedBackendFeatureFlags;
  profile?: ManagedBackendProfileSummary;
}

export interface ManagedBackendHealthSummary extends AdapterHealthSummary {
  backends: ManagedBackendHealthReport[];
}

export interface ManagedQueueMessage<TPayload = unknown> {
  id: string;
  topic: string;
  payload: TPayload;
  createdAt: number;
  runAt?: number;
  priority?: number;
  metadata?: Record<string, string>;
}

export interface ManagedQueueReceipt {
  messageId: string;
  backendMessageId: string;
  acceptedAt: number;
  state: "accepted" | "queued" | "scheduled";
  metadata?: Record<string, string>;
}

export interface ManagedQueueDepth {
  available: number;
  inFlight?: number;
  scheduled?: number;
  deadLetter?: number;
}

export interface ManagedStoreRecord<TValue = unknown> {
  key: string;
  value: TValue;
  updatedAt: number;
  etag?: string;
  metadata?: Record<string, string>;
}

export interface ManagedStorePutOptions {
  expectedEtag?: string;
}

export interface ManagedStoreQuery {
  prefix?: string;
  cursor?: string;
  limit?: number;
}

export interface ManagedStorePage<TValue = unknown> {
  items: ManagedStoreRecord<TValue>[];
  nextCursor?: string;
}

export interface ManagedMetricRecord {
  name: string;
  type: "counter" | "gauge" | "histogram";
  value: number;
  recordedAt: number;
  labels?: Record<string, string>;
  description?: string;
}

export interface ManagedTraceRecord {
  traceId: string;
  spanId: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  status?: "ok" | "error";
  attributes?: Record<string, string | number | boolean>;
}

export interface ManagedBackendAdapter {
  readonly domain: ManagedBackendDomain;
  readonly capability: ManagedBackendCapability;
  readonly mode: ManagedBackendMode;
  readonly durability?: AdapterDurability;
  getHealth?(): MaybePromise<AdapterHealthReport>;
  getManagedHealth?(): MaybePromise<ManagedBackendHealthReport>;
}

export interface ManagedBackendQueueAdapter<TPayload = unknown> extends ManagedBackendAdapter {
  readonly capability: "queue";
  enqueue(message: ManagedQueueMessage<TPayload>): Promise<ManagedQueueReceipt>;
  getDepth?(): MaybePromise<ManagedQueueDepth>;
}

export interface ManagedBackendStoreAdapter<TValue = unknown> extends ManagedBackendAdapter {
  readonly capability: "store";
  put(record: ManagedStoreRecord<TValue>, options?: ManagedStorePutOptions): Promise<void>;
  get(key: string): Promise<ManagedStoreRecord<TValue> | undefined>;
  list?(query?: ManagedStoreQuery): Promise<ManagedStorePage<TValue>>;
  delete?(key: string): Promise<boolean>;
}

export interface ManagedBackendObservabilityAdapter extends ManagedBackendAdapter {
  readonly capability: "observability";
  recordMetric(record: ManagedMetricRecord): Promise<void>;
  recordTrace(record: ManagedTraceRecord): Promise<void>;
  flush?(): Promise<void>;
}

export interface ManagedBackendSuite {
  queue?: ManagedBackendQueueAdapter;
  store?: ManagedBackendStoreAdapter;
  observability?: ManagedBackendObservabilityAdapter;
}

export interface ManagedBackendInventory {
  data?: Partial<ManagedBackendSuite>;
  compute?: Partial<ManagedBackendSuite>;
  dev?: Partial<ManagedBackendSuite>;
}

export type DataManagedBackendSuite = ManagedBackendSuite;
export type ComputeManagedBackendSuite = ManagedBackendSuite;
export type DevManagedBackendSuite = ManagedBackendSuite;

export type AdapterHealthResponse = AdapterHealthSummary | AdapterHealthReport[];

export type ManagedBackendHealthResponse =
  | ManagedBackendHealthSummary
  | ManagedBackendHealthReport[];

export interface DevIntegrationHealthReport extends AdapterHealthReport {
  name: string;
  checkedAt: number;
  integrationId: string;
  integrationStatus: DevIntegrationStatus;
  webhookConfigured: boolean;
  version?: string;
}

export interface DevIntegrationHealthSummary extends AdapterHealthSummary {
  integrations: DevIntegrationHealthReport[];
  runtimeVersion: string;
}

export type DevIntegrationHealthResponse =
  | DevIntegrationHealthSummary
  | DevIntegrationHealthReport[];

export type MissionStatus =
  | "Draft"
  | "Open"
  | "Claimed"
  | "InProgress"
  | "UnderReview"
  | "Settled"
  | "Failed"
  | "Cancelled";

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

export interface ComputeJob {
  id: string;
  topic: string;
  payload: unknown;
  runAt: number;
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

export interface VerifyCredentialInput {
  credential: VerifiableCredential;
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

export interface RegisterPolicyInput {
  id?: string;
  name: string;
  version: string;
  rules: PolicyRule[];
  ownerId: string;
  createdAt?: number;
  updatedAt?: number;
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
  version?: string;
  supportedCoreVersions?: string[];
}

export interface RegisterDevIntegrationInput {
  ownerId: string;
  name: string;
  webhookUrl: string;
  version?: string;
  supportedCoreVersions?: string[];
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

export interface PaymentLedgerEntry {
  from: string;
  to: string;
  amountCents: number;
  reference: string;
  txId: string;
  executedAt: number;
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

export type ZKArtifactRole =
  | "wasm"
  | "r1cs"
  | "proving-key"
  | "verification-key"
  | "srs"
  | "metadata";

export type ZKIntegrityAlgorithm = "sha256";

export type ZKArtifactSource = "inline" | "local" | "remote";

export interface ZKArtifactDescriptor {
  role: ZKArtifactRole;
  uri: string;
  version: string;
  integrity: string;
  integrityAlgorithm?: ZKIntegrityAlgorithm;
  source?: ZKArtifactSource;
  bytes?: number;
  inlineData?: string;
}

export interface ZKArtifactManifest {
  id: string;
  schemaVersion?: string;
  proofType: ZKProofType;
  manifestVersion: string;
  runtimeVersion: string;
  integrityAlgorithm?: ZKIntegrityAlgorithm;
  circuit: {
    name: string;
    version: string;
    provingSystem: string;
  };
  artifacts: ZKArtifactDescriptor[];
  createdAt: number;
  publishedAt?: number;
  artifactCount?: number;
  manifestIntegrity: string;
}

export interface ZKBridgeRuntimeInfo {
  adapter: string;
  runtimeVersion: string;
  durability: AdapterDurability;
  manifestCatalog: {
    schemaVersions: string[];
    manifestsByType: Partial<Record<ZKProofType, string[]>>;
  };
  features: {
    manifestVersioning: boolean;
    artifactIntegrity: boolean;
    receiptTraceability: boolean;
    deterministicLocalAdapter: boolean;
    remoteAdapterSkeleton: boolean;
  };
}

export interface ExternalZKProveRequest {
  requestId: string;
  traceId: string;
  proofType: ZKProofType;
  proverId: string;
  challenge: string;
  publicInputs: Record<string, unknown>;
  witness: unknown;
  createdAt: number;
  manifest: ZKArtifactManifest;
}

export interface ExternalZKProveResponse {
  commitment: string;
  proof: string;
  traceId?: string;
  adapterReceiptId?: string;
}

export interface ExternalZKVerifyRequest {
  traceId: string;
  proofId: string;
  proofType: ZKProofType;
  proverId: string;
  commitment: string;
  proof: string;
  publicInputs: Record<string, unknown>;
  createdAt: number;
  manifest: ZKArtifactManifest;
}

export interface ExternalZKVerifyResponse {
  verified: boolean;
  traceId?: string;
  adapterReceiptId?: string;
  details?: Record<string, string>;
}

export interface ZKVerificationReceipt {
  id: string;
  proofId: string;
  proofType: ZKProofType;
  verified: boolean;
  verifier: string;
  manifestId: string;
  manifestVersion: string;
  manifestIntegrity: string;
  proofDigest: string;
  publicInputsDigest: string;
  traceId: string;
  adapterReceiptId?: string;
  details?: Record<string, string>;
  checkedAt: number;
}

export interface ZKProofBridgeMetadata {
  adapter: string;
  manifestId: string;
  manifestVersion: string;
  manifestIntegrity: string;
  manifestSchemaVersion?: string;
  runtimeVersion?: string;
  traceId: string;
  proofDigest: string;
  publicInputsDigest?: string;
  adapterReceiptId?: string;
}

export interface ZKProof {
  id: string;
  type: ZKProofType;
  proverId: string;
  commitment: string;
  publicInputs: Record<string, unknown>;
  proof: string;
  verified: boolean;
  createdAt: number;
  bridge?: ZKProofBridgeMetadata;
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
  receipt?: ZKVerificationReceipt;
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
  jurorId: string;
  vote: "uphold" | "reject";
  reasoning: string;
}

// ── Batch 6: Events and analytics types ───────────────────────

export interface JournalEvent<TPayload = unknown> {
  name: string;
  payload: TPayload;
  createdAt: number;
}

export interface EventReplayRecord {
  offset: number;
  event: JournalEvent;
}

export interface EventReplayResponse {
  records: EventReplayRecord[];
  nextOffset: number;
}

export type AnalyticsPeriod = "hour" | "day" | "week";

export interface TopCategory {
  category: string;
  count: number;
}

export interface TopEarner {
  participantId: string;
  amountCents: number;
}

export interface ModuleRevenue {
  module: string;
  amountCents: number;
}

export interface NetworkStats {
  totalParticipants: number;
  totalTasks: number;
  completedTasks: number;
  disputeRate: number;
  avgReputation: number;
  totalRevenueCents: number;
  activeComputeProviders: number;
  dataAssetsCount: number;
}

export interface TaskAnalytics {
  created: number;
  completed: number;
  failed: number;
  avgCompletionTimeMs: number;
  topCategories: TopCategory[];
}

export interface EconomicAnalytics {
  totalSettled: number;
  avgPaymentCents: number;
  topEarners: TopEarner[];
  revenueByModule: ModuleRevenue[];
}

export interface SecurityAnalytics {
  spamBlockedCount: number;
  disputeCount: number;
  challengeCount: number;
  avgSpamScore: number;
}

// ── Batch 6: Security route types ──────────────────────────────

export type ThreatCategory =
  | "sybil_attack"
  | "collusion"
  | "front_running"
  | "replay_attack"
  | "data_poisoning"
  | "identity_theft"
  | "ddos"
  | "smart_contract_exploit";

export type ThreatSeverity = "low" | "medium" | "high" | "critical";

export interface ThreatEntry {
  id: string;
  category: ThreatCategory;
  description: string;
  severity: ThreatSeverity;
  mitigations: string[];
  residualRisk: number;
}

export interface SecurityAuditInput {
  participants: number;
  transactions: number;
  disputes: number;
  avgReputation: number;
}

export interface SecurityAuditResult {
  timestamp: number;
  threats: ThreatEntry[];
  overallRiskScore: number;
  recommendations: string[];
}

export interface SybilResistanceAssessment {
  participantId: string;
  score: number;
  identityVerificationRate: number;
  averageStakeCents: number;
  minimumStakeCents: number;
}

// ── Batch 6: Mission route types ───────────────────────────────

export type ExecutionStepKind =
  | "tool_call"
  | "artifact_produced"
  | "decision"
  | "external_action";

export type MissionChallengeReason =
  | "verdict_disagreement"
  | "low_confidence"
  | "manual_escalation";

export interface MissionContext {
  objective: string;
  constraints: string[];
  successCriteria: string[];
  deadlineAt?: number;
}

export interface MissionCompensationLeg {
  id: string;
  payerId: string;
  payeeId: string;
  assetId: string;
  amount: number;
  unit: string;
  description?: string;
}

export interface MissionCompensationModel {
  mode: "single_asset" | "multi_asset";
  legs: MissionCompensationLeg[];
  settlementWindowSec?: number;
  metadata?: Record<string, string>;
}

export interface MissionExecutionStep {
  id: string;
  missionId: string;
  agentId: string;
  kind: ExecutionStepKind;
  summary: string;
  inputHash?: string;
  outputHash?: string;
  createdAt: number;
}

export interface MissionEvidenceProvenance {
  agentId: string;
  stepId?: string;
  timestamp: number;
  signature?: string;
}

export interface MissionEvidenceBundle {
  id: string;
  missionId: string;
  summary: string;
  artifactUris: string[];
  bundleHash: string;
  provenance: MissionEvidenceProvenance;
  createdAt: number;
}

export interface MissionValidationVerdict {
  id: string;
  missionId: string;
  reviewerId: string;
  approve: boolean;
  confidence: number;
  notes?: string;
  createdAt: number;
}

export type MissionChallengeStakeStatus = "posted" | "returned" | "forfeited";

export interface MissionChallengeStakePenalty {
  payerId: string;
  payeeId: string;
  amountCents: number;
}

export interface MissionChallengeStakeDistribution {
  juryRecipientId: string;
  juryAmountCents: number;
  protocolRecipientId: string;
  protocolAmountCents: number;
}

export interface MissionChallengeStake {
  challengeId: string;
  challengerId: string;
  amountCents: number;
  minimumAmountCents: number;
  assetId: string;
  unit: string;
  status: MissionChallengeStakeStatus;
  postedAt: number;
  returnedAt?: number;
  forfeitedAt?: number;
  penalty?: MissionChallengeStakePenalty;
  distribution?: MissionChallengeStakeDistribution;
}

export type MissionChallengeStatus = "open" | "resolved";

export interface MissionChallenge {
  id: string;
  missionId: string;
  challengerId: string;
  counterpartyId: string;
  reason: MissionChallengeReason;
  stake: MissionChallengeStake;
  status: MissionChallengeStatus;
  triggeredByVerdictIds: string[];
  openedAt: number;
  resolvedAt?: number;
  resolution?: "approved" | "rejected";
  resolutionNotes?: string;
}

export interface MissionEnvelope {
  id: string;
  issuerId: string;
  title: string;
  budgetCents: number;
  context: MissionContext;
  compensationModel?: MissionCompensationModel;
  status: MissionStatus;
  targetAgentIds: string[];
  claimedBy?: string;
  executionSteps: MissionExecutionStep[];
  evidenceBundles: MissionEvidenceBundle[];
  verdicts: MissionValidationVerdict[];
  challenges: MissionChallenge[];
  retryCount: number;
  maxRetries: number;
  escalationCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateMissionInput {
  issuerId: string;
  title: string;
  budgetCents: number;
  context: MissionContext;
  compensationModel?: MissionCompensationModel;
  targetAgentIds?: string[];
  maxRetries?: number;
}

export interface AppendMissionStepInput {
  agentId: string;
  kind: ExecutionStepKind;
  summary: string;
  inputHash?: string;
  outputHash?: string;
}

export interface SubmitMissionEvidenceInput {
  agentId: string;
  summary: string;
  artifactUris: string[];
  bundleHash: string;
  stepId?: string;
  signature?: string;
}

export interface RecordMissionVerdictInput {
  reviewerId: string;
  approve: boolean;
  confidence: number;
  notes?: string;
  challengeStakeCents?: number;
  challengeCounterpartyId?: string;
}

export interface OpenMissionChallengeInput {
  challengerId: string;
  counterpartyId: string;
  reason: MissionChallengeReason;
  stakeAmountCents?: number;
  triggeredByVerdictIds?: string[];
  notes?: string;
}

export interface ResolveMissionChallengeInput {
  resolverId: string;
  approve: boolean;
  notes?: string;
}

// ── Batch 6: ZK circuit/formal verification types ─────────────

export type ZKWireVisibility = "public" | "private" | "internal";

export interface ZKCircuitWire {
  id: string;
  visibility: ZKWireVisibility;
  description?: string;
}

export type ZKCircuitGateType = "add" | "mul" | "boolean" | "range" | "hash" | "eq" | "cmp";

export interface ZKCircuitGate {
  id: string;
  type: ZKCircuitGateType;
  inputWires: string[];
  outputWire: string;
  description?: string;
}

export interface ZKCircuitConstraint {
  id: string;
  description: string;
}

export interface ZKConstraintSystem {
  fieldPrime: string;
  publicInputOrder: string[];
  wires: ZKCircuitWire[];
  gates: ZKCircuitGate[];
  constraints: ZKCircuitConstraint[];
}

export interface ZKCircuitDefinition {
  proofType: ZKProofType;
  name: string;
  version: string;
  provingSystem: "groth16";
  description: string;
  constraintSystem: ZKConstraintSystem;
}

export type ZKFormalSecurityProperty = "soundness" | "completeness" | "zero-knowledge";

export interface ZKFormalProof {
  property: ZKFormalSecurityProperty;
  satisfied: boolean;
  details: string;
  checkedAt: number;
  assumptions: string[];
}

export interface ZKFormalVerificationReport {
  proofId: string;
  proofType: ZKProofType;
  allSatisfied: boolean;
  properties: ZKFormalProof[];
  checkedAt: number;
}

// ── Batch 6: X402 types ───────────────────────────────────────

export interface MetaTransaction {
  from: string;
  to: string;
  value: number;
  data: string;
  nonce: number;
  gasPrice: number;
  gasLimit: number;
  relayerSignature: string;
}

export interface RelayX402PaymentInput {
  fromId?: string;
  toId?: string;
  from?: string;
  to?: string;
  amountCents?: number;
  amount?: number;
  gasSponsored?: boolean;
}

export interface X402PaymentReceipt {
  from: string;
  to: string;
  amountCents: number;
  reference: string;
  beneficiaryId: string;
  gasSponsored: boolean;
  gasUsed: number;
  gasCostCents: number;
  txId: string;
  paymentTxId: string;
  relayedAt: number;
  data?: string;
  metaTransaction: MetaTransaction;
}

export interface SponsoredGasStats {
  beneficiaryId: string;
  sponsoredGasUsed: number;
  sponsoredTxCount: number;
  lastSponsoredAt?: number;
}

// ── Batch 6: Heartbeat types ──────────────────────────────────

export interface HeartbeatTask {
  id: string;
  name: string;
  intervalMs: number;
  enabled: boolean;
  payload?: Record<string, unknown>;
  lastRunAt?: number;
  nextRunAt: number;
}

export interface RegisterHeartbeatTaskInput {
  name: string;
  intervalMs: number;
  payload?: Record<string, unknown>;
  startAt?: number;
}

export interface HeartbeatExecution {
  task: HeartbeatTask;
  executedAt: number;
}

// ── Batch 6: Economics route types ────────────────────────────

export type EconomicsAssetKind =
  | "usdc"
  | "stablecoin"
  | "llm_token"
  | "cloud_credit"
  | "api_quota"
  | "custom";

export interface EconomicsAsset {
  id: string;
  kind: EconomicsAssetKind;
  symbol: string;
  network?: string;
  issuer?: string;
  metadata?: Record<string, string>;
}

export interface RegisterEconomicsAssetInput {
  id?: string;
  kind: EconomicsAssetKind;
  symbol: string;
  network?: string;
  issuer?: string;
  metadata?: Record<string, string>;
}

export interface EconomicsCompensationLeg {
  id: string;
  payerId: string;
  payeeId: string;
  assetId: string;
  amount: number;
  unit: string;
  description?: string;
}

export interface EconomicsCompensationModel {
  mode: "single_asset" | "multi_asset";
  legs: EconomicsCompensationLeg[];
  settlementWindowSec?: number;
  metadata?: Record<string, string>;
}

export interface CompensationQuote {
  model: EconomicsCompensationModel;
  totalsByAsset: Record<string, number>;
}

export interface CompensationValuation {
  assetId: string;
  referenceAssetId: string;
  rate: number;
  asOf: number;
  source?: string;
}

export interface CreateCompensationValuationInput {
  assetId: string;
  referenceAssetId: string;
  rate: number;
  asOf?: number;
  source?: string;
}

export interface ReferenceAssetCompensationQuote {
  referenceAssetId: string;
  totalsByAsset: Record<string, number>;
  convertedByAsset: Record<string, number>;
  totalInReference: number;
  missingAssetIds: string[];
}

export interface SettlementPlanLine {
  assetId: string;
  amount: number;
  rail: "onchain_stablecoin" | "llm_metering" | "cloud_billing" | "api_quota" | "custom";
  unit?: string;
}

export interface SettlementPlan {
  id: string;
  createdAt: number;
  lines: SettlementPlanLine[];
}

// ── Batch 10: Governance and rewards route types ──────────────

export type GovernanceVoteChoice = "for" | "against" | "abstain";

export type GovernanceProposalStatus =
  | "pending"
  | "active"
  | "succeeded"
  | "defeated"
  | "executed";

export interface GovernanceProposalAction {
  target: string;
  signature: string;
  calldata: string;
  value: number;
  description?: string;
}

export interface GovernanceVoteRecord {
  proposalId: string;
  voterId: string;
  choice: GovernanceVoteChoice;
  weight: number;
  castAt: number;
  txId: string;
}

export interface GovernanceProposal {
  id: string;
  proposerId: string;
  title: string;
  description: string;
  actions: GovernanceProposalAction[];
  quorum: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  status: GovernanceProposalStatus;
  createdAt: number;
  votingStartsAt: number;
  votingEndsAt: number;
  creationTxId: string;
  executedAt?: number;
  executedBy?: string;
  executionTxId?: string;
  votes: GovernanceVoteRecord[];
}

export interface CreateGovernanceProposalInput {
  proposerId: string;
  title: string;
  description: string;
  actions?: GovernanceProposalAction[];
  quorum?: number;
  votingStartsAt?: number;
  votingEndsAt: number;
}

export interface VoteGovernanceProposalInput {
  voterId: string;
  choice?: GovernanceVoteChoice;
  support?: boolean;
  weight?: number;
}

export interface ExecuteGovernanceProposalInput {
  executorId?: string;
}

export type RewardClaimStatus = "pending" | "claimed";

export interface EpochRewardDistribution {
  participantId: string;
  amountCents: number;
}

export interface DistributeEpochRewardsInput {
  distributions: EpochRewardDistribution[];
}

export interface ParticipantEpochReward {
  epoch: number;
  participantId: string;
  amountCents: number;
  claimStatus: RewardClaimStatus;
  syncedAt: number;
  claimedAt?: number;
}

export interface EpochRewardsSyncResult {
  epoch: number;
  participantCount: number;
  totalAmountCents: number;
  syncedAt: number;
  txId: string;
  rewards: ParticipantEpochReward[];
}

export interface ParticipantRewardsSnapshot {
  participantId: string;
  totalRewardsCents: number;
  claimedRewardsCents: number;
  pendingRewardsCents: number;
  epochs: ParticipantEpochReward[];
}

// ── Batch 34: Onchain finality route types ───────────────────

export type OnchainTransactionStatus = "submitted" | "confirmed" | "finalized" | "reorged";

export type OnchainTransactionOperation =
  | "governance_proposal_create"
  | "governance_proposal_vote"
  | "governance_proposal_execute"
  | "rewards_epoch_sync"
  | "rewards_claim_sync";

export interface OnchainTransactionRecord {
  txId: string;
  operation: OnchainTransactionOperation;
  status: OnchainTransactionStatus;
  submittedAt: number;
  includedAt?: number;
  finalizedAt?: number;
  reorgedAt?: number;
  lastUpdatedAt: number;
  participantId?: string;
  proposalId?: string;
  epoch?: number;
  referenceId?: string;
  blockNumber?: number;
  blockHash?: string;
  confirmations: number;
  confirmationDepth: number;
  finalityDepth: number;
}

export interface OnchainTransactionQuery {
  status?: OnchainTransactionStatus | "all";
  operation?: OnchainTransactionOperation;
  participantId?: string;
  proposalId?: string;
  epoch?: number;
  referenceId?: string;
  cursor?: string;
  limit?: number;
}

export interface OnchainTransactionPage {
  items: OnchainTransactionRecord[];
  nextCursor?: string;
}

export interface OnchainFinalitySummary {
  trackedTransactionCount: number;
  submittedCount: number;
  confirmedCount: number;
  finalizedCount: number;
  reorgedCount: number;
  headBlockNumber?: number;
  confirmationDepth: number;
  finalityDepth: number;
}

export interface TrackOnchainTransactionInput {
  txId: string;
  operation: OnchainTransactionOperation;
  submittedAt?: number;
  participantId?: string;
  proposalId?: string;
  epoch?: number;
  referenceId?: string;
}

export interface RecordOnchainTransactionInclusionInput {
  txId: string;
  blockNumber: number;
  blockHash: string;
  includedAt?: number;
}

export interface RecordCanonicalBlockInput {
  blockNumber: number;
  blockHash: string;
}

export interface OnchainIndexerHookEvent {
  kind: "tracked" | "included" | "status_changed" | "reorged" | "finalized";
  transaction: OnchainTransactionRecord;
  previousTransaction?: OnchainTransactionRecord;
  summary: OnchainFinalitySummary;
}

export type OnchainIndexerHook = (event: OnchainIndexerHookEvent) => void | Promise<void>;

export interface OnchainFinalityProvider {
  trackTransaction(
    input: TrackOnchainTransactionInput,
  ): OnchainTransactionRecord | Promise<OnchainTransactionRecord>;
  recordTransactionInclusion(
    input: RecordOnchainTransactionInclusionInput,
  ): OnchainTransactionRecord | Promise<OnchainTransactionRecord>;
  recordCanonicalBlock(input: RecordCanonicalBlockInput): void | Promise<void>;
  advanceHead(
    blockNumber: number,
    blockHash?: string,
  ): OnchainFinalitySummary | Promise<OnchainFinalitySummary>;
  getTransaction(
    txId: string,
  ): OnchainTransactionRecord | undefined | Promise<OnchainTransactionRecord | undefined>;
  listTransactions(query?: OnchainTransactionQuery): OnchainTransactionPage | Promise<OnchainTransactionPage>;
  getSummary(): OnchainFinalitySummary | Promise<OnchainFinalitySummary>;
}

export interface UnsignedSerializedTransaction {
  to: string;
  data: string;
  nonce: number;
}

export interface TransactionSigner {
  getAddress(): string | Promise<string>;
  signTransaction(payload: UnsignedSerializedTransaction): Promise<string>;
}

// ── Batch 8: Token economics route types ───────────────────────

export type TokenEconomicsApplication =
  | "tasks"
  | "pay"
  | "id"
  | "data"
  | "compute"
  | "dev"
  | "ecosystem";

export interface PactTokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  launchTimestamp: number;
}

export interface TokenDistributionEntry {
  application: TokenEconomicsApplication;
  allocationPercent: number;
  allocationAmount: number;
  initialUnlockPercent: number;
  description?: string;
}

export interface TokenSupplyProjection {
  month: number;
  timestamp: number;
  circulatingSupply: number;
  lockedSupply: number;
  totalSupply: number;
}

export interface TokenDistributionReport {
  token: PactTokenInfo;
  distribution: TokenDistributionEntry[];
  totalAllocated: number;
}

export interface TokenSupplyReport {
  token: PactTokenInfo;
  asOf: number;
  months: number;
  circulatingSupply: number;
  projections: TokenSupplyProjection[];
}

export interface TokenApyInput {
  totalStaked: number;
  emissionRate: number;
}

export interface TokenApyReport {
  totalStaked: number;
  emissionRate: number;
  apy: number;
}

export interface TokenBurnRateInput {
  transactionVolume: number;
  burnPercent: number;
}

export interface TokenBurnRateReport {
  transactionVolume: number;
  burnPercent: number;
  burnedAmount: number;
  netVolume: number;
}

// ── Batch 8: Role/participant matrix route types ───────────────

export type RoleMatrixParticipantRole =
  | "task_issuer"
  | "worker"
  | "validator"
  | "data_provider"
  | "compute_provider"
  | "developer"
  | "governor"
  | "investor";

export type RoleMatrixModule =
  | "tasks"
  | "compute"
  | "data"
  | "pay"
  | "id"
  | "dev"
  | "governance"
  | "economics";

export interface RoleMatrixRequirements {
  minReputation: number;
  requiredIdentityLevel: IdentityLevel;
  minStake: number;
}

export type RoleActionPermissions = Record<string, boolean>;

export interface RoleCapabilityMatrix {
  tasks: RoleActionPermissions;
  compute: RoleActionPermissions;
  data: RoleActionPermissions;
  pay: RoleActionPermissions;
  id: RoleActionPermissions;
  dev: RoleActionPermissions;
  governance: RoleActionPermissions;
  economics: RoleActionPermissions;
}

export interface RoleCapabilitiesResponse {
  role: RoleMatrixParticipantRole;
  capabilities: RoleCapabilityMatrix;
}

export interface RoleRequirementsResponse {
  role: RoleMatrixParticipantRole;
  requirements: RoleMatrixRequirements;
}

export interface RoleActionCheckInput {
  role: RoleMatrixParticipantRole | string;
  module: RoleMatrixModule;
  action: string;
}

export interface RoleActionCheckResponse {
  role: RoleMatrixParticipantRole;
  module: RoleMatrixModule;
  action: string;
  allowed: boolean;
}

export type ParticipantMatrixType = "individual" | "organization";

export type ParticipantMatrixCategory =
  | "human_individual"
  | "human_organization"
  | "agent_individual"
  | "agent_organization";

export interface ParticipantMatrixCategoryInput {
  type: ParticipantMatrixType;
  isAgent: boolean;
}

export interface ParticipantMatrixCategoryResponse {
  type: ParticipantMatrixType;
  isAgent: boolean;
  category: ParticipantMatrixCategory;
  applicableRoles: RoleMatrixParticipantRole[];
}


// ── Batch 6: Ecosystem types ──────────────────────────────────

export type EcosystemModule = "tasks" | "pay" | "id" | "data" | "compute" | "dev";

export type ModuleDependency = Record<EcosystemModule, EcosystemModule[]>;

export interface ModuleStatSnapshot {
  availability?: number;
  errorRate?: number;
  latencyMs?: number;
  throughput?: number;
  activeUsers?: number;
}

export type EcosystemHealthState = "healthy" | "degraded" | "critical";

export interface ModuleHealth {
  module: EcosystemModule;
  status: EcosystemHealthState;
  score: number;
  availability: number;
  errorRate: number;
  latencyMs: number;
  throughput: number;
  activeUsers: number;
  dependencies: EcosystemModule[];
  dependencyIssues: EcosystemModule[];
}

export interface EcosystemHealth {
  generatedAt: number;
  score: number;
  status: EcosystemHealthState;
  healthyModules: number;
  degradedModules: number;
  criticalModules: number;
  dependencyRisk: number;
  modules: Record<EcosystemModule, ModuleHealth>;
}

export interface ModuleCoverage {
  users: number;
  adoptionRate: number;
}

export interface CrossAppSynergy {
  generatedAt: number;
  sevenAppModel: {
    appCount: number;
    maxConnectionsPerUser: number;
    coreSurface: "pact-core";
  };
  activeUsers: number;
  participatingModules: EcosystemModule[];
  usersInMultipleModules: number;
  crossModuleRate: number;
  averageModulesPerUser: number;
  averageAppsPerUser: number;
  realizedConnectionDensity: number;
  synergyScore: number;
  amplificationFactor: number;
  moduleCoverage: Record<EcosystemModule, ModuleCoverage>;
}
