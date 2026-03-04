import type {
  CreateTaskInput,
  HealthResponse,
  RegisterParticipantInput,
  SubmitTaskInput,
  Task,
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
