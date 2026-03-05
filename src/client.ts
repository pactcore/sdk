import type {
  CreateTaskInput,
  HealthResponse,
  RegisterParticipantInput,
  SubmitTaskInput,
  Task,
  ComputeProvider,
  ComputeUsageRecord,
  ComputeJobResult,
  ComputeJobInput,
  DIDDocument,
  VerifiableCredential,
  IssueCredentialInput,
  CapabilityCheckResult,
  DataAsset,
  PublishDataAssetInput,
  ProvenanceEdge,
  IntegrityProof,
  DataAccessPolicy,
  DataAccessCheckResult,
  DevIntegration,
  RegisterDevIntegrationInput,
  PolicyPackage,
  PolicyEvaluationResult,
  SDKTemplate,
  RegisterSDKTemplateInput,
} from "./types";
import {
  buildSettlementAuditQueryParams,
  buildSettlementReplayQueryParams,
  type ReconcileSettlementRecordInput,
  SettlementExecutionRequest,
  SettlementExecutionResult,
  SettlementRecordPage,
  SettlementRecordPageRequest,
  SettlementRecordReplayPage,
  SettlementRecordReplayRequest,
  SettlementRecord,
  SettlementRecordFilter,
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

  async registerParticipant(input: RegisterParticipantInput): Promise<unknown> {
    return this.request("POST", "/id/participants", input);
  }

  async listWorkers(): Promise<unknown[]> {
    return this.request<unknown[]>("GET", "/id/workers");
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    return this.request<Task>("POST", "/tasks", input);
  }

  async assignTask(taskId: string, workerId?: string): Promise<Task> {
    return this.request<Task>("POST", `/tasks/${taskId}/assign`, workerId ? { workerId } : {});
  }

  async submitTask(taskId: string, input: SubmitTaskInput): Promise<Task> {
    return this.request<Task>("POST", `/tasks/${taskId}/submit`, input);
  }

  async listTasks(): Promise<Task[]> {
    return this.request<Task[]>("GET", "/tasks");
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>("GET", `/tasks/${taskId}`);
  }

  async getLedger(): Promise<unknown[]> {
    return this.request<unknown[]>("GET", "/payments/ledger");
  }

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
      `/economics/settlements/records/${recordId}/reconcile`,
      input ?? {},
    );
  }

  async getSettlementRecord(recordId: string): Promise<SettlementRecord> {
    return this.request<SettlementRecord>("GET", `/economics/settlements/records/${recordId}`);
  }

  // ── PactCompute ────────────────────────────────────────────

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
    if (minGpu !== undefined) params.set("minGpu", String(minGpu));
    return this.request<ComputeProvider[]>("GET", `/compute/providers/search?${params}`);
  }

  async enqueueComputeJob(input: ComputeJobInput): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/compute/jobs", input);
  }

  async dispatchComputeJob(jobId: string, providerId?: string): Promise<ComputeJobResult> {
    return this.request<ComputeJobResult>(
      "POST",
      `/compute/jobs/${jobId}/dispatch`,
      providerId ? { providerId } : {},
    );
  }

  async getComputeUsageRecords(jobId?: string): Promise<ComputeUsageRecord[]> {
    const suffix = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
    return this.request<ComputeUsageRecord[]>("GET", `/compute/usage${suffix}`);
  }

  // ── PactID / DID ───────────────────────────────────────────

  async getDIDDocument(participantId: string): Promise<DIDDocument> {
    return this.request<DIDDocument>("GET", `/id/did/${participantId}`);
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
      `/id/capabilities/${participantId}/${encodeURIComponent(capability)}`,
    );
  }

  // ── PactData ───────────────────────────────────────────────

  async publishDataAsset(input: PublishDataAssetInput): Promise<DataAsset> {
    return this.request<DataAsset>("POST", "/data/assets", input);
  }

  async listDataAssets(): Promise<DataAsset[]> {
    return this.request<DataAsset[]>("GET", "/data/assets");
  }

  async getDataAssetLineage(assetId: string): Promise<ProvenanceEdge[]> {
    return this.request<ProvenanceEdge[]>("GET", `/data/assets/${assetId}/lineage`);
  }

  async getDataAssetDependents(assetId: string): Promise<ProvenanceEdge[]> {
    return this.request<ProvenanceEdge[]>("GET", `/data/assets/${assetId}/dependents`);
  }

  async registerIntegrityProof(
    assetId: string,
    contentHash: string,
  ): Promise<IntegrityProof> {
    return this.request<IntegrityProof>(
      "POST",
      `/data/assets/${assetId}/integrity`,
      { contentHash },
    );
  }

  async verifyDataIntegrity(
    assetId: string,
    contentHash: string,
  ): Promise<{ valid: boolean }> {
    return this.request<{ valid: boolean }>(
      "POST",
      `/data/assets/${assetId}/integrity/verify`,
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
      `/data/assets/${assetId}/access`,
      { allowedParticipantIds, isPublic },
    );
  }

  async checkDataAccess(
    assetId: string,
    participantId: string,
  ): Promise<DataAccessCheckResult> {
    return this.request<DataAccessCheckResult>(
      "GET",
      `/data/assets/${assetId}/access/${participantId}`,
    );
  }

  // ── PactDev ────────────────────────────────────────────────

  async registerDevIntegration(input: RegisterDevIntegrationInput): Promise<DevIntegration> {
    return this.request<DevIntegration>("POST", "/dev/integrations", input);
  }

  async listDevIntegrations(): Promise<DevIntegration[]> {
    return this.request<DevIntegration[]>("GET", "/dev/integrations");
  }

  async activateIntegration(id: string): Promise<DevIntegration> {
    return this.request<DevIntegration>("POST", `/dev/integrations/${id}/activate`);
  }

  async suspendIntegration(id: string): Promise<DevIntegration> {
    return this.request<DevIntegration>("POST", `/dev/integrations/${id}/suspend`);
  }

  async deprecateIntegration(id: string): Promise<DevIntegration> {
    return this.request<DevIntegration>("POST", `/dev/integrations/${id}/deprecate`);
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
