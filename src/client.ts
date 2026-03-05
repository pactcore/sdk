import type {
  AddMicropaymentInput,
  AnalyticsPeriod,
  AntiSpamAction,
  AntiSpamCheckInput,
  AntiSpamCheckResult,
  AntiSpamProfile,
  AntiSpamRecordInput,
  AntiSpamRecordResult,
  AntiSpamStakeResult,
  ApiKeyInfo,
  AppendMissionStepInput,
  CapabilityCheckResult,
  CompensationQuote,
  CompensationValuation,
  ComputeJobInput,
  ComputeJobResult,
  ComputePricingQuote,
  ComputePricingQuoteInput,
  ComputeProvider,
  ComputeUsageRecord,
  CreateApiKeyInput,
  CreateCompensationValuationInput,
  CreateDataListingInput,
  CreateDisputeInput,
  CreateMissionInput,
  CreateTaskInput,
  CreateZKCompletionProofInput,
  CreateZKIdentityProofInput,
  CreateZKLocationProofInput,
  CreateZKReputationProofInput,
  CreditLine,
  CrossAppSynergy,
  DIDDocument,
  DataAccessCheckResult,
  DataAccessPolicy,
  DataAsset,
  DataCategory,
  DataListing,
  DataMarketplaceStats,
  DataPurchase,
  DisputeCase,
  DisputeStatus,
  DisputeVoteInput,
  DevIntegration,
  EconomicAnalytics,
  EcosystemHealth,
  EconomicsAsset,
  EconomicsCompensationModel,
  EventReplayResponse,
  GasSponsorshipGrant,
  GrantGasSponsorshipInput,
  HealthResponse,
  HeartbeatExecution,
  HeartbeatTask,
  IntegrityProof,
  IssueCredentialInput,
  MetricsSnapshot,
  MicropaymentAcceptedResponse,
  MicropaymentBatch,
  ModuleDependency,
  MissionEnvelope,
  MissionEvidenceBundle,
  MissionExecutionStep,
  MissionValidationVerdict,
  NetworkStats,
  ObservabilityHealthResponse,
  ObservabilityTracesResponse,
  OnchainParticipantIdentity,
  OpenCreditLineInput,
  OpenMissionChallengeInput,
  OverallUsageStats,
  Participant,
  ParticipantMatrixCategoryInput,
  ParticipantMatrixCategoryResponse,
  ParticipantLevelResponse,
  ParticipantLevelUpgradeResult,
  ParticipantStats,
  PaymentRoute,
  PluginInstall,
  PluginListingView,
  PolicyEvaluationResult,
  PolicyPackage,
  ProvenanceEdge,
  PublishDataAssetInput,
  PublishPluginInput,
  PurchaseDataListingInput,
  RecordMissionVerdictInput,
  RecordReputationEventInput,
  ReferenceAssetCompensationQuote,
  RegisterDevIntegrationInput,
  RegisterEconomicsAssetInput,
  RegisterHeartbeatTaskInput,
  RegisterParticipantInput,
  RegisterSDKTemplateInput,
  RegisteredApiKey,
  RelayX402PaymentInput,
  ReputationCategory,
  ReputationEvent,
  ReputationProfile,
  RoleActionCheckInput,
  RoleActionCheckResponse,
  RoleCapabilitiesResponse,
  RoleRequirementsResponse,
  ResolveMissionChallengeInput,
  ResourceTier,
  RevenueShare,
  RoutePaymentInput,
  SDKTemplate,
  SecurityAnalytics,
  SettlementPlan,
  SecurityAuditInput,
  SecurityAuditResult,
  SponsoredGasStats,
  SubmitDisputeEvidenceInput,
  SubmitMissionEvidenceInput,
  SubmitTaskInput,
  SybilResistanceAssessment,
  Task,
  TaskAnalytics,
  ThreatEntry,
  TokenApyInput,
  TokenApyReport,
  TokenBurnRateInput,
  TokenBurnRateReport,
  TokenDistributionReport,
  TokenSupplyReport,
  UsageStats,
  VerifiableCredential,
  WorkerProfile,
  X402PaymentReceipt,
  ZKCircuitDefinition,
  ZKFormalVerificationReport,
  ZKProof,
  ZKProofVerificationResult,
} from "./types";
import {
  buildSettlementAuditQueryParams,
  buildSettlementReplayQueryParams,
  type ReconcileSettlementRecordInput,
  SettlementExecutionRequest,
  SettlementExecutionResult,
  SettlementRecord,
  SettlementRecordFilter,
  SettlementRecordPage,
  SettlementRecordPageRequest,
  SettlementRecordReplayPage,
  SettlementRecordReplayRequest,
} from "./economics";

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface PactSdkOptions {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  fetchImpl?: FetchLike;
}

export class PactSdk {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly fetchImpl: FetchLike;

  constructor(options: PactSdkOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.extraHeaders = options.headers ?? {};
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/health");
  }

  // ── Observability & admin ─────────────────────────────────────

  async getObservabilityHealth(): Promise<ObservabilityHealthResponse> {
    return this.request<ObservabilityHealthResponse>("GET", "/observability/health");
  }

  async getObservabilityMetrics(): Promise<MetricsSnapshot> {
    return this.request<MetricsSnapshot>("GET", "/observability/metrics");
  }

  async getObservabilityTraces(limit?: number): Promise<ObservabilityTracesResponse> {
    const suffix = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : "";
    return this.request<ObservabilityTracesResponse>("GET", `/observability/traces${suffix}`);
  }

  async replayEvents(fromOffset?: number, limit?: number): Promise<EventReplayResponse> {
    const params = new URLSearchParams();
    if (fromOffset !== undefined) {
      params.set("fromOffset", String(fromOffset));
    }
    if (limit !== undefined) {
      params.set("limit", String(limit));
    }
    const query = params.toString();
    const suffix = query ? `?${query}` : "";
    return this.request<EventReplayResponse>("GET", `/events/replay${suffix}`);
  }

  async getNetworkAnalytics(): Promise<NetworkStats> {
    return this.request<NetworkStats>("GET", "/analytics/network");
  }

  async getTaskAnalytics(period?: AnalyticsPeriod): Promise<TaskAnalytics> {
    const suffix = period ? `?period=${encodeURIComponent(period)}` : "";
    return this.request<TaskAnalytics>("GET", `/analytics/tasks${suffix}`);
  }

  async getEconomicsAnalytics(): Promise<EconomicAnalytics> {
    return this.request<EconomicAnalytics>("GET", "/analytics/economics");
  }

  async getSecurityAnalytics(): Promise<SecurityAnalytics> {
    return this.request<SecurityAnalytics>("GET", "/analytics/security");
  }

  async getEcosystemStatus(): Promise<EcosystemHealth> {
    return this.request<EcosystemHealth>("GET", "/ecosystem/status");
  }

  async getEcosystemModules(): Promise<ModuleDependency> {
    return this.request<ModuleDependency>("GET", "/ecosystem/modules");
  }

  async getEcosystemSynergy(): Promise<CrossAppSynergy> {
    return this.request<CrossAppSynergy>("GET", "/ecosystem/synergy");
  }

  async createApiKey(input: CreateApiKeyInput): Promise<RegisteredApiKey> {
    return this.request<RegisteredApiKey>("POST", "/admin/api-keys", input);
  }

  async listApiKeys(ownerId: string): Promise<ApiKeyInfo[]> {
    const query = `?ownerId=${encodeURIComponent(ownerId)}`;
    return this.request<ApiKeyInfo[]>("GET", `/admin/api-keys${query}`);
  }

  async revokeApiKey(apiKeyId: string): Promise<void> {
    await this.request("DELETE", `/admin/api-keys/${encodeURIComponent(apiKeyId)}`);
  }

  async getUsageStats(apiKeyId: string): Promise<UsageStats> {
    const query = `?apiKeyId=${encodeURIComponent(apiKeyId)}`;
    return this.request<UsageStats>("GET", `/admin/usage${query}`);
  }

  async getOverallUsageStats(): Promise<OverallUsageStats> {
    return this.request<OverallUsageStats>("GET", "/admin/usage/overall");
  }

  // ── Anti-spam ────────────────────────────────────────────────

  async checkAntiSpam(input: AntiSpamCheckInput): Promise<AntiSpamCheckResult> {
    return this.request<AntiSpamCheckResult>("POST", "/anti-spam/check", input);
  }

  async recordAntiSpamAction(input: AntiSpamRecordInput): Promise<AntiSpamRecordResult> {
    return this.request<AntiSpamRecordResult>("POST", "/anti-spam/record", input);
  }

  async getAntiSpamProfile(participantId: string): Promise<AntiSpamProfile> {
    return this.request<AntiSpamProfile>(
      "GET",
      `/anti-spam/${encodeURIComponent(participantId)}/profile`,
    );
  }

  async getAntiSpamStake(
    participantId: string,
    action: AntiSpamAction,
  ): Promise<AntiSpamStakeResult> {
    return this.request<AntiSpamStakeResult>(
      "GET",
      `/anti-spam/${encodeURIComponent(participantId)}/stake/${encodeURIComponent(action)}`,
    );
  }

  async getSecurityThreats(): Promise<ThreatEntry[]> {
    return this.request<ThreatEntry[]>("GET", "/security/threats");
  }

  async runSecurityAudit(input: SecurityAuditInput): Promise<SecurityAuditResult> {
    return this.request<SecurityAuditResult>("POST", "/security/audit", input);
  }

  async getSecuritySybilResistance(participantId: string): Promise<SybilResistanceAssessment> {
    return this.request<SybilResistanceAssessment>(
      "GET",
      `/security/sybil-resistance/${encodeURIComponent(participantId)}`,
    );
  }

  // ── Role/participant matrix ──────────────────────────────────

  async getRoleCapabilities(role: string): Promise<RoleCapabilitiesResponse> {
    return this.request<RoleCapabilitiesResponse>(
      "GET",
      `/roles/${encodeURIComponent(role)}/capabilities`,
    );
  }

  async getRoleRequirements(role: string): Promise<RoleRequirementsResponse> {
    return this.request<RoleRequirementsResponse>(
      "GET",
      `/roles/${encodeURIComponent(role)}/requirements`,
    );
  }

  async checkRoleAction(input: RoleActionCheckInput): Promise<RoleActionCheckResponse> {
    return this.request<RoleActionCheckResponse>("POST", "/roles/check-action", input);
  }

  async getParticipantMatrixCategory(
    input: ParticipantMatrixCategoryInput,
  ): Promise<ParticipantMatrixCategoryResponse> {
    return this.request<ParticipantMatrixCategoryResponse>(
      "POST",
      "/participants/matrix/category",
      input,
    );
  }

  // ── Reputation ────────────────────────────────────────────────

  async listReputationLeaderboard(
    category?: ReputationCategory,
    limit?: number,
  ): Promise<ReputationProfile[]> {
    const params = new URLSearchParams();
    if (category) {
      params.set("category", category);
    }
    if (limit !== undefined) {
      params.set("limit", String(limit));
    }
    const query = params.toString();
    const suffix = query ? `?${query}` : "";
    return this.request<ReputationProfile[]>("GET", `/reputation/leaderboard${suffix}`);
  }

  async getReputation(participantId: string): Promise<ReputationProfile> {
    return this.request<ReputationProfile>(
      "GET",
      `/reputation/${encodeURIComponent(participantId)}`,
    );
  }

  async recordReputationEvent(
    participantId: string,
    input: RecordReputationEventInput,
  ): Promise<ReputationProfile> {
    return this.request<ReputationProfile>(
      "POST",
      `/reputation/${encodeURIComponent(participantId)}/events`,
      input,
    );
  }

  async getReputationHistory(participantId: string, limit?: number): Promise<ReputationEvent[]> {
    const suffix = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : "";
    return this.request<ReputationEvent[]>(
      "GET",
      `/reputation/${encodeURIComponent(participantId)}/history${suffix}`,
    );
  }

  // ── PactID / DID ──────────────────────────────────────────────

  async registerParticipant(input: RegisterParticipantInput): Promise<Participant> {
    return this.request<Participant>("POST", "/id/participants", input);
  }

  async listWorkers(): Promise<WorkerProfile[]> {
    return this.request<WorkerProfile[]>("GET", "/id/workers");
  }

  async getDIDDocument(participantId: string): Promise<DIDDocument> {
    return this.request<DIDDocument>("GET", `/id/did/${encodeURIComponent(participantId)}`);
  }

  async getOnchainIdentity(participantId: string): Promise<OnchainParticipantIdentity | null> {
    return this.request<OnchainParticipantIdentity | null>(
      "GET",
      `/id/onchain/${encodeURIComponent(participantId)}`,
    );
  }

  async syncOnchainIdentity(participantId: string): Promise<OnchainParticipantIdentity | null> {
    return this.request<OnchainParticipantIdentity | null>(
      "POST",
      `/id/onchain/${encodeURIComponent(participantId)}/sync`,
      {},
    );
  }

  async getParticipantLevel(participantId: string): Promise<ParticipantLevelResponse> {
    return this.request<ParticipantLevelResponse>(
      "GET",
      `/id/participants/${encodeURIComponent(participantId)}/level`,
    );
  }

  async upgradeParticipantLevel(participantId: string): Promise<ParticipantLevelUpgradeResult> {
    return this.request<ParticipantLevelUpgradeResult>(
      "POST",
      `/id/participants/${encodeURIComponent(participantId)}/upgrade-level`,
      {},
    );
  }

  async getParticipantStats(participantId: string): Promise<ParticipantStats> {
    return this.request<ParticipantStats>(
      "GET",
      `/id/participants/${encodeURIComponent(participantId)}/stats`,
    );
  }

  async recordParticipantTaskCompleted(participantId: string): Promise<ParticipantStats> {
    return this.request<ParticipantStats>(
      "POST",
      `/id/participants/${encodeURIComponent(participantId)}/task-completed`,
      {},
    );
  }

  async issueCredential(input: IssueCredentialInput): Promise<VerifiableCredential> {
    return this.request<VerifiableCredential>("POST", "/id/credentials", input);
  }

  async verifyCredential(credential: VerifiableCredential): Promise<{ valid: boolean }> {
    return this.request<{ valid: boolean }>("POST", "/id/credentials/verify", credential);
  }

  async checkCapability(
    participantId: string,
    capability: string,
  ): Promise<CapabilityCheckResult> {
    return this.request<CapabilityCheckResult>(
      "GET",
      `/id/capabilities/${encodeURIComponent(participantId)}/${encodeURIComponent(capability)}`,
    );
  }

  // ── ZK proofs ────────────────────────────────────────────────

  async createZKLocationProof(input: CreateZKLocationProofInput): Promise<ZKProof> {
    return this.request<ZKProof>("POST", "/zk/proofs/location", input);
  }

  async createZKCompletionProof(input: CreateZKCompletionProofInput): Promise<ZKProof> {
    return this.request<ZKProof>("POST", "/zk/proofs/completion", input);
  }

  async createZKIdentityProof(input: CreateZKIdentityProofInput): Promise<ZKProof> {
    return this.request<ZKProof>("POST", "/zk/proofs/identity", input);
  }

  async createZKReputationProof(input: CreateZKReputationProofInput): Promise<ZKProof> {
    return this.request<ZKProof>("POST", "/zk/proofs/reputation", input);
  }

  async verifyZKProof(proofId: string): Promise<ZKProofVerificationResult> {
    return this.request<ZKProofVerificationResult>(
      "POST",
      `/zk/proofs/${encodeURIComponent(proofId)}/verify`,
      {},
    );
  }

  async getZKProof(proofId: string): Promise<ZKProof | null> {
    return this.request<ZKProof | null>("GET", `/zk/proofs/${encodeURIComponent(proofId)}`);
  }

  async getZKCircuitDefinition(type: ZKProof["type"]): Promise<ZKCircuitDefinition> {
    return this.request<ZKCircuitDefinition>("GET", `/zk/circuits/${encodeURIComponent(type)}`);
  }

  async formalVerifyZKProof(proofId: string): Promise<ZKFormalVerificationReport> {
    return this.request<ZKFormalVerificationReport>(
      "POST",
      `/zk/formal-verify/${encodeURIComponent(proofId)}`,
      {},
    );
  }

  // ── Tasks ────────────────────────────────────────────────────

  async createTask(input: CreateTaskInput): Promise<Task> {
    return this.request<Task>("POST", "/tasks", input);
  }

  async assignTask(taskId: string, workerId?: string): Promise<Task> {
    return this.request<Task>(
      "POST",
      `/tasks/${encodeURIComponent(taskId)}/assign`,
      workerId ? { workerId } : {},
    );
  }

  async submitTask(taskId: string, input: SubmitTaskInput): Promise<Task> {
    return this.request<Task>("POST", `/tasks/${encodeURIComponent(taskId)}/submit`, input);
  }

  async listTasks(): Promise<Task[]> {
    return this.request<Task[]>("GET", "/tasks");
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>("GET", `/tasks/${encodeURIComponent(taskId)}`);
  }

  async createMission(input: CreateMissionInput): Promise<MissionEnvelope> {
    return this.request<MissionEnvelope>("POST", "/missions", input);
  }

  async listMissions(): Promise<MissionEnvelope[]> {
    return this.request<MissionEnvelope[]>("GET", "/missions");
  }

  async getMission(missionId: string): Promise<MissionEnvelope> {
    return this.request<MissionEnvelope>("GET", `/missions/${encodeURIComponent(missionId)}`);
  }

  async claimMission(missionId: string, agentId: string): Promise<MissionEnvelope> {
    return this.request<MissionEnvelope>(
      "POST",
      `/missions/${encodeURIComponent(missionId)}/claim`,
      { agentId },
    );
  }

  async appendMissionStep(
    missionId: string,
    input: AppendMissionStepInput,
  ): Promise<MissionExecutionStep> {
    return this.request<MissionExecutionStep>(
      "POST",
      `/missions/${encodeURIComponent(missionId)}/steps`,
      input,
    );
  }

  async submitMissionEvidence(
    missionId: string,
    input: SubmitMissionEvidenceInput,
  ): Promise<MissionEvidenceBundle> {
    return this.request<MissionEvidenceBundle>(
      "POST",
      `/missions/${encodeURIComponent(missionId)}/evidence`,
      input,
    );
  }

  async recordMissionVerdict(
    missionId: string,
    input: RecordMissionVerdictInput,
  ): Promise<MissionValidationVerdict> {
    return this.request<MissionValidationVerdict>(
      "POST",
      `/missions/${encodeURIComponent(missionId)}/verdict`,
      input,
    );
  }

  async openMissionChallenge(
    missionId: string,
    input: OpenMissionChallengeInput,
  ): Promise<MissionEnvelope> {
    return this.request<MissionEnvelope>(
      "POST",
      `/missions/${encodeURIComponent(missionId)}/challenges`,
      input,
    );
  }

  async resolveMissionChallenge(
    missionId: string,
    challengeId: string,
    input: ResolveMissionChallengeInput,
  ): Promise<MissionEnvelope> {
    return this.request<MissionEnvelope>(
      "POST",
      `/missions/${encodeURIComponent(missionId)}/challenges/${encodeURIComponent(challengeId)}/resolve`,
      input,
    );
  }

  // ── Payment routing ──────────────────────────────────────────

  async routePayment(input: RoutePaymentInput): Promise<PaymentRoute> {
    return this.request<PaymentRoute>("POST", "/pay/route", {
      fromId: input.fromId,
      toId: input.toId,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
    });
  }

  async relayX402Payment(input: RelayX402PaymentInput): Promise<X402PaymentReceipt> {
    return this.request<X402PaymentReceipt>("POST", "/pay/x402/relay", {
      fromId: input.fromId ?? input.from,
      toId: input.toId ?? input.to,
      amountCents: input.amountCents ?? input.amount,
      gasSponsored: input.gasSponsored ?? false,
    });
  }

  async getX402GasStats(beneficiaryId: string): Promise<SponsoredGasStats> {
    return this.request<SponsoredGasStats>(
      "GET",
      `/pay/x402/gas-stats/${encodeURIComponent(beneficiaryId)}`,
    );
  }

  async listPaymentRoutes(): Promise<PaymentRoute[]> {
    return this.request<PaymentRoute[]>("GET", "/pay/routes");
  }

  async addMicropayment(input: AddMicropaymentInput): Promise<MicropaymentAcceptedResponse> {
    return this.request<MicropaymentAcceptedResponse>("POST", "/pay/micropayments", input);
  }

  async flushMicropayments(payerId: string): Promise<MicropaymentBatch> {
    return this.request<MicropaymentBatch>("POST", "/pay/micropayments/flush", { payerId });
  }

  async openCreditLine(input: OpenCreditLineInput): Promise<CreditLine> {
    return this.request<CreditLine>("POST", "/pay/credit-lines", input);
  }

  async useCreditLine(creditLineId: string, amountCents: number): Promise<CreditLine> {
    return this.request<CreditLine>(
      "POST",
      `/pay/credit-lines/${encodeURIComponent(creditLineId)}/use`,
      { amountCents },
    );
  }

  async repayCreditLine(creditLineId: string, amountCents: number): Promise<CreditLine> {
    return this.request<CreditLine>(
      "POST",
      `/pay/credit-lines/${encodeURIComponent(creditLineId)}/repay`,
      { amountCents },
    );
  }

  async grantGasSponsorship(input: GrantGasSponsorshipInput): Promise<GasSponsorshipGrant> {
    return this.request<GasSponsorshipGrant>("POST", "/pay/gas-sponsorship", input);
  }

  async useGasSponsorship(grantId: string, gasCents: number): Promise<GasSponsorshipGrant> {
    return this.request<GasSponsorshipGrant>(
      "POST",
      `/pay/gas-sponsorship/${encodeURIComponent(grantId)}/use`,
      { gasCents },
    );
  }

  async getLedger(): Promise<unknown[]> {
    return this.request<unknown[]>("GET", "/payments/ledger");
  }

  // ── Token economics ───────────────────────────────────────────

  async getTokenDistribution(): Promise<TokenDistributionReport> {
    return this.request<TokenDistributionReport>("GET", "/economics/token/distribution");
  }

  async getTokenSupply(months?: number): Promise<TokenSupplyReport> {
    const suffix = months !== undefined ? `?months=${encodeURIComponent(String(months))}` : "";
    return this.request<TokenSupplyReport>("GET", `/economics/token/supply${suffix}`);
  }

  async calculateTokenApy(input: TokenApyInput): Promise<TokenApyReport> {
    return this.request<TokenApyReport>("POST", "/economics/token/apy", input);
  }

  async calculateTokenBurnRate(input: TokenBurnRateInput): Promise<TokenBurnRateReport> {
    return this.request<TokenBurnRateReport>("POST", "/economics/token/burn-rate", input);
  }

  async registerEconomicsAsset(input: RegisterEconomicsAssetInput): Promise<EconomicsAsset> {
    return this.request<EconomicsAsset>("POST", "/economics/assets", input);
  }

  async listEconomicsAssets(): Promise<EconomicsAsset[]> {
    return this.request<EconomicsAsset[]>("GET", "/economics/assets");
  }

  async quoteEconomicsCompensation(model: EconomicsCompensationModel): Promise<CompensationQuote> {
    return this.request<CompensationQuote>("POST", "/economics/quote", model);
  }

  async registerCompensationValuation(
    input: CreateCompensationValuationInput,
  ): Promise<CompensationValuation> {
    return this.request<CompensationValuation>("POST", "/economics/valuations", input);
  }

  async listCompensationValuations(referenceAssetId?: string): Promise<CompensationValuation[]> {
    const suffix = referenceAssetId
      ? `?referenceAssetId=${encodeURIComponent(referenceAssetId)}`
      : "";
    return this.request<CompensationValuation[]>("GET", `/economics/valuations${suffix}`);
  }

  async quoteCompensationInReference(
    model: EconomicsCompensationModel,
    referenceAssetId: string,
  ): Promise<ReferenceAssetCompensationQuote> {
    return this.request<ReferenceAssetCompensationQuote>(
      "POST",
      "/economics/quote-reference",
      { model, referenceAssetId },
    );
  }

  async planCompensationSettlement(model: EconomicsCompensationModel): Promise<SettlementPlan> {
    return this.request<SettlementPlan>("POST", "/economics/settlement-plan", model);
  }

  // ── Settlements (economics) ─────────────────────────────────

  async executeSettlement(input: SettlementExecutionRequest): Promise<SettlementExecutionResult> {
    return this.request<SettlementExecutionResult>("POST", "/economics/settlements/execute", input);
  }

  async listSettlementRecords(filter?: SettlementRecordFilter): Promise<SettlementRecord[]> {
    const suffix = buildSettlementAuditQueryParams(filter);
    const path = `/economics/settlements/records${suffix}`;
    return this.request<SettlementRecord[]>("GET", path);
  }

  async querySettlementAuditRecords(
    filter?: SettlementRecordFilter,
    page?: SettlementRecordPageRequest,
  ): Promise<SettlementRecordPage> {
    const suffix = buildSettlementAuditQueryParams(filter, page);
    return this.request<SettlementRecordPage>("GET", `/economics/settlements/records/page${suffix}`);
  }

  async querySettlementReconciliationRecords(
    filter?: Omit<SettlementRecordFilter, "status"> & { status?: SettlementRecord["status"] },
    page?: SettlementRecordPageRequest,
  ): Promise<SettlementRecordPage> {
    return this.querySettlementAuditRecords(
      {
        ...filter,
        status: filter?.status ?? "reconciled",
      },
      page,
    );
  }

  async replaySettlementRecordLifecycle(
    input?: SettlementRecordReplayRequest,
  ): Promise<SettlementRecordReplayPage> {
    const suffix = buildSettlementReplayQueryParams(input);
    return this.request<SettlementRecordReplayPage>(
      "GET",
      `/economics/settlements/records/replay${suffix}`,
    );
  }

  async reconcileSettlementRecord(
    recordId: string,
    input?: ReconcileSettlementRecordInput,
  ): Promise<SettlementRecord> {
    return this.request<SettlementRecord>(
      "POST",
      `/economics/settlements/records/${encodeURIComponent(recordId)}/reconcile`,
      input ?? {},
    );
  }

  async getSettlementRecord(recordId: string): Promise<SettlementRecord> {
    return this.request<SettlementRecord>(
      "GET",
      `/economics/settlements/records/${encodeURIComponent(recordId)}`,
    );
  }

  // ── PactCompute ─────────────────────────────────────────────

  async registerComputeProvider(provider: ComputeProvider): Promise<void> {
    await this.request("POST", "/compute/providers", provider);
  }

  async listComputeProviders(): Promise<ComputeProvider[]> {
    return this.request<ComputeProvider[]>("GET", "/compute/providers");
  }

  async findComputeProviders(
    minCpu: number,
    minMemory: number,
    minGpu?: number,
  ): Promise<ComputeProvider[]> {
    const params = new URLSearchParams({
      minCpu: String(minCpu),
      minMemory: String(minMemory),
    });
    if (minGpu !== undefined) {
      params.set("minGpu", String(minGpu));
    }
    return this.request<ComputeProvider[]>("GET", `/compute/providers/search?${params}`);
  }

  async listComputePricingTiers(): Promise<ResourceTier[]> {
    return this.request<ResourceTier[]>("GET", "/compute/pricing/tiers");
  }

  async quoteComputePricing(input: ComputePricingQuoteInput): Promise<ComputePricingQuote> {
    return this.request<ComputePricingQuote>("POST", "/compute/pricing/quote", {
      capabilities: input.capabilities,
      durationSeconds: input.durationSeconds,
    });
  }

  async enqueueComputeJob(input: ComputeJobInput): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/compute/jobs", input);
  }

  async dispatchComputeJob(jobId: string, providerId?: string): Promise<ComputeJobResult> {
    return this.request<ComputeJobResult>(
      "POST",
      `/compute/jobs/${encodeURIComponent(jobId)}/dispatch`,
      providerId ? { providerId } : {},
    );
  }

  async getComputeUsageRecords(jobId?: string): Promise<ComputeUsageRecord[]> {
    const suffix = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
    return this.request<ComputeUsageRecord[]>("GET", `/compute/usage${suffix}`);
  }

  async registerHeartbeatTask(input: RegisterHeartbeatTaskInput): Promise<HeartbeatTask> {
    return this.request<HeartbeatTask>("POST", "/heartbeat/tasks", input);
  }

  async listHeartbeatTasks(): Promise<HeartbeatTask[]> {
    return this.request<HeartbeatTask[]>("GET", "/heartbeat/tasks");
  }

  async enableHeartbeatTask(taskId: string): Promise<HeartbeatTask> {
    return this.request<HeartbeatTask>(
      "POST",
      `/heartbeat/tasks/${encodeURIComponent(taskId)}/enable`,
      {},
    );
  }

  async disableHeartbeatTask(taskId: string): Promise<HeartbeatTask> {
    return this.request<HeartbeatTask>(
      "POST",
      `/heartbeat/tasks/${encodeURIComponent(taskId)}/disable`,
      {},
    );
  }

  async tickHeartbeat(now?: number): Promise<HeartbeatExecution[]> {
    return this.request<HeartbeatExecution[]>(
      "POST",
      "/heartbeat/tick",
      now === undefined ? {} : { now },
    );
  }

  // ── PactData ────────────────────────────────────────────────

  async publishDataAsset(input: PublishDataAssetInput): Promise<DataAsset> {
    return this.request<DataAsset>("POST", "/data/assets", input);
  }

  async listDataAssets(): Promise<DataAsset[]> {
    return this.request<DataAsset[]>("GET", "/data/assets");
  }

  async getDataAssetLineage(assetId: string): Promise<ProvenanceEdge[]> {
    return this.request<ProvenanceEdge[]>("GET", `/data/assets/${encodeURIComponent(assetId)}/lineage`);
  }

  async getDataAssetDependents(assetId: string): Promise<ProvenanceEdge[]> {
    return this.request<ProvenanceEdge[]>(
      "GET",
      `/data/assets/${encodeURIComponent(assetId)}/dependents`,
    );
  }

  async registerIntegrityProof(assetId: string, contentHash: string): Promise<IntegrityProof> {
    return this.request<IntegrityProof>(
      "POST",
      `/data/assets/${encodeURIComponent(assetId)}/integrity`,
      { contentHash },
    );
  }

  async verifyDataIntegrity(assetId: string, contentHash: string): Promise<{ valid: boolean }> {
    return this.request<{ valid: boolean }>(
      "POST",
      `/data/assets/${encodeURIComponent(assetId)}/integrity/verify`,
      { contentHash },
    );
  }

  async setDataAccessPolicy(
    assetId: string,
    allowedParticipantIds: string[],
    isPublic: boolean,
  ): Promise<DataAccessPolicy> {
    return this.request<DataAccessPolicy>(
      "PUT",
      `/data/assets/${encodeURIComponent(assetId)}/access`,
      { allowedParticipantIds, isPublic },
    );
  }

  async checkDataAccess(assetId: string, participantId: string): Promise<DataAccessCheckResult> {
    return this.request<DataAccessCheckResult>(
      "GET",
      `/data/assets/${encodeURIComponent(assetId)}/access/${encodeURIComponent(participantId)}`,
    );
  }

  async createDataListing(input: CreateDataListingInput): Promise<DataListing> {
    return this.request<DataListing>("POST", "/data/marketplace/list", input);
  }

  async delistDataListing(listingId: string): Promise<void> {
    await this.request("DELETE", `/data/marketplace/listings/${encodeURIComponent(listingId)}`);
  }

  async listDataListings(category?: DataCategory): Promise<DataListing[]> {
    const suffix = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request<DataListing[]>("GET", `/data/marketplace/listings${suffix}`);
  }

  async purchaseDataListing(input: PurchaseDataListingInput): Promise<DataPurchase> {
    return this.request<DataPurchase>("POST", "/data/marketplace/purchase", input);
  }

  async getDataMarketplaceStats(): Promise<DataMarketplaceStats> {
    return this.request<DataMarketplaceStats>("GET", "/data/marketplace/stats");
  }

  // ── PactDev ─────────────────────────────────────────────────

  async publishPlugin(input: PublishPluginInput): Promise<PluginListingView> {
    return this.request<PluginListingView>("POST", "/dev/plugins/publish", input);
  }

  async listPlugins(): Promise<PluginListingView[]> {
    return this.request<PluginListingView[]>("GET", "/dev/plugins");
  }

  async installPlugin(pluginId: string, installerId: string): Promise<PluginInstall> {
    return this.request<PluginInstall>(
      "POST",
      `/dev/plugins/${encodeURIComponent(pluginId)}/install`,
      { installerId },
    );
  }

  async recordPluginRevenue(pluginId: string, revenueCents: number): Promise<RevenueShare> {
    return this.request<RevenueShare>(
      "POST",
      `/dev/plugins/${encodeURIComponent(pluginId)}/revenue`,
      { revenueCents },
    );
  }

  async getDeveloperPluginPayouts(developerId: string): Promise<RevenueShare[]> {
    return this.request<RevenueShare[]>(
      "GET",
      `/dev/plugins/payouts/${encodeURIComponent(developerId)}`,
    );
  }

  async registerDevIntegration(input: RegisterDevIntegrationInput): Promise<DevIntegration> {
    return this.request<DevIntegration>("POST", "/dev/integrations", input);
  }

  async listDevIntegrations(): Promise<DevIntegration[]> {
    return this.request<DevIntegration[]>("GET", "/dev/integrations");
  }

  async activateIntegration(id: string): Promise<DevIntegration> {
    return this.request<DevIntegration>("POST", `/dev/integrations/${encodeURIComponent(id)}/activate`);
  }

  async suspendIntegration(id: string): Promise<DevIntegration> {
    return this.request<DevIntegration>("POST", `/dev/integrations/${encodeURIComponent(id)}/suspend`);
  }

  async deprecateIntegration(id: string): Promise<DevIntegration> {
    return this.request<DevIntegration>("POST", `/dev/integrations/${encodeURIComponent(id)}/deprecate`);
  }

  async listPolicies(): Promise<PolicyPackage[]> {
    return this.request<PolicyPackage[]>("GET", "/dev/policies");
  }

  async registerPolicy(pkg: PolicyPackage): Promise<void> {
    await this.request("POST", "/dev/policies", pkg);
  }

  async evaluatePolicy(context: Record<string, unknown>): Promise<PolicyEvaluationResult> {
    return this.request<PolicyEvaluationResult>("POST", "/dev/policies/evaluate", context);
  }

  async registerTemplate(input: RegisterSDKTemplateInput): Promise<SDKTemplate> {
    return this.request<SDKTemplate>("POST", "/dev/templates", input);
  }

  async listTemplates(): Promise<SDKTemplate[]> {
    return this.request<SDKTemplate[]>("GET", "/dev/templates");
  }

  // ── Disputes ──────────────────────────────────────────────────

  async createDispute(input: CreateDisputeInput): Promise<DisputeCase> {
    return this.request<DisputeCase>("POST", "/disputes", input);
  }

  async listDisputes(status?: DisputeStatus): Promise<DisputeCase[]> {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<DisputeCase[]>("GET", `/disputes${suffix}`);
  }

  async getDispute(disputeId: string): Promise<DisputeCase> {
    return this.request<DisputeCase>("GET", `/disputes/${encodeURIComponent(disputeId)}`);
  }

  async submitDisputeEvidence(
    disputeId: string,
    input: SubmitDisputeEvidenceInput,
  ): Promise<DisputeCase> {
    return this.request<DisputeCase>(
      "POST",
      `/disputes/${encodeURIComponent(disputeId)}/evidence`,
      input,
    );
  }

  async voteOnDispute(disputeId: string, input: DisputeVoteInput): Promise<DisputeCase> {
    return this.request<DisputeCase>(
      "POST",
      `/disputes/${encodeURIComponent(disputeId)}/vote`,
      input,
    );
  }

  async resolveDispute(disputeId: string): Promise<DisputeCase> {
    return this.request<DisputeCase>("POST", `/disputes/${encodeURIComponent(disputeId)}/resolve`, {});
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        ...this.extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`PACT SDK request failed (${response.status}): ${message}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
