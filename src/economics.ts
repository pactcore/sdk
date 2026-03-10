export type CompensationAssetKind =
  | "usdc"
  | "stablecoin"
  | "llm_token"
  | "cloud_credit"
  | "api_quota"
  | "custom";

export interface CompensationAssetDescriptor {
  id: string;
  kind: CompensationAssetKind;
  symbol?: string;
}

export interface CompensationLegInput {
  payerId: string;
  payeeId: string;
  assetId: string;
  amount: number;
  unit: string;
  description?: string;
}

export interface CompensationModelInput {
  mode?: "single_asset" | "multi_asset";
  settlementWindowSec?: number;
  legs: CompensationLegInput[];
  metadata?: Record<string, string>;
}

export interface CompensationModel {
  mode: "single_asset" | "multi_asset";
  settlementWindowSec?: number;
  legs: Array<CompensationLegInput & { id: string }>;
  metadata?: Record<string, string>;
}

export interface AssetValuationRate {
  assetId: string;
  referenceAssetId: string;
  rate: number;
}

export interface ReferenceAssetQuote {
  referenceAssetId: string;
  totalsByAsset: Record<string, number>;
  convertedByAsset: Record<string, number>;
  totalInReference: number;
  missingAssetIds: string[];
}

export interface SettlementLine {
  assetId: string;
  amount: number;
  rail: SettlementRail;
}

export type SettlementRail =
  | "onchain_stablecoin"
  | "llm_metering"
  | "cloud_billing"
  | "api_quota"
  | "custom";

export type SettlementConnector =
  | "stablecoin_bridge"
  | "llm_token_metering"
  | "cloud_credit_billing"
  | "api_quota_allocation";

export type SettlementConnectorKind = SettlementConnector;

export type SettlementConnectorOperation =
  | "submit_stablecoin_transfer"
  | "apply_metering_credit"
  | "apply_billing_credit"
  | "allocate_quota";

export type SettlementConnectorCredentialType =
  | "none"
  | "api_key"
  | "bearer"
  | "basic"
  | "oauth2"
  | "service_account";

export interface SettlementConnectorCredentialFieldSchema {
  key: string;
  required?: boolean;
  secret?: boolean;
}

export interface SettlementConnectorCredentialSchema {
  type: SettlementConnectorCredentialType;
  fields: SettlementConnectorCredentialFieldSchema[];
}

export interface SettlementConnectorProviderProfile {
  id: string;
  providerId: string;
  displayName?: string;
  endpoint?: string;
  timeoutMs?: number;
  credentialSchema: SettlementConnectorCredentialSchema;
  credentials: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface SettlementConnectorTransportRequest {
  connector: SettlementConnectorKind;
  operation: SettlementConnectorOperation;
  method: "POST";
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
}

export interface SettlementConnectorTransportResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface SettlementConnectorTransport {
  send(request: SettlementConnectorTransportRequest): Promise<SettlementConnectorTransportResponse>;
}

export interface SettlementConnectorProfileSummary {
  profileId: string;
  providerId: string;
  displayName?: string;
  endpoint?: string;
  credentialType: SettlementConnectorCredentialType;
  configuredCredentialFields: string[];
}

export interface SettlementConnectorRequest {
  settlementId: string;
  recordId: string;
  legId: string;
  assetId: string;
  amount: number;
  unit: string;
  payerId: string;
  payeeId: string;
  externalReference?: string;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
  connectorMetadata?: Record<string, string>;
}

export interface SettlementConnectorResult {
  status: "applied";
  externalReference: string;
  processedAt: number;
  metadata?: Record<string, string>;
  appliedAt?: number;
  idempotencyKey?: string;
  connectorMetadata?: Record<string, string>;
}

export interface StablecoinBridgeSettlementRequest
  extends Omit<SettlementConnectorRequest, "externalReference"> {
  externalReference: string;
  chainId: number;
  network: string;
  tokenAddress: string;
  fromAddress: string;
  toAddress: string;
}

export interface StablecoinBridgeSettlementResult extends SettlementConnectorResult {
  transactionHash?: string;
  chainId?: number;
  network?: string;
  blockNumber?: number;
}

export interface SettlementExecutionRequest {
  settlementId?: string;
  model: CompensationModel;
  idempotencyKey: string;
}

export interface SettlementRecord {
  id: string;
  settlementId: string;
  legId: string;
  assetId: string;
  rail: SettlementRail;
  connector: SettlementConnector;
  payerId: string;
  payeeId: string;
  amount: number;
  unit: string;
  status: "applied" | "reconciled";
  externalReference: string;
  connectorMetadata?: Record<string, string>;
  createdAt: number;
  reconciledAt?: number;
  reconciledBy?: string;
  reconciliationNote?: string;
}

export interface SettlementExecutionResult {
  settlementId: string;
  executedAt: number;
  records: SettlementRecord[];
  idempotencyKey: string;
}

export interface SettlementRecordFilter {
  settlementId?: string;
  assetId?: string;
  rail?: SettlementRecord["rail"];
  payerId?: string;
  payeeId?: string;
  status?: SettlementRecord["status"];
  reconciledBy?: string;
}

export interface SettlementRecordPageRequest {
  cursor?: string;
  limit?: number;
}

export interface SettlementRecordPage {
  items: SettlementRecord[];
  nextCursor?: string;
}

export type SettlementRecordLifecycleAction = "created" | "reconciled";

export interface SettlementRecordLifecycleEntry {
  offset: number;
  action: SettlementRecordLifecycleAction;
  recordId: string;
  settlementId: string;
  status: SettlementRecord["status"];
  occurredAt: number;
  record: SettlementRecord;
}

export interface SettlementRecordReplayRequest {
  fromOffset?: number;
  limit?: number;
}

export interface SettlementRecordReplayPage {
  entries: SettlementRecordLifecycleEntry[];
  nextOffset?: number;
}

export interface ReconcileSettlementRecordInput {
  reconciledBy?: string;
  note?: string;
  reconciledAt?: number;
}

export type SettlementConnectorHealthState = "open" | "half_open" | "closed";

export interface SettlementConnectorRetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffStrategy?: "linear" | "exponential";
  maxBackoffMs?: number;
}

export interface SettlementConnectorCircuitBreakerPolicy {
  failureThreshold: number;
  cooldownMs: number;
}

export interface SettlementConnectorFailure {
  attempt: number;
  failedAt: number;
  message: string;
  settlementId: string;
  recordId: string;
  idempotencyKey?: string;
}

export interface SettlementConnectorHealth {
  state: SettlementConnectorHealthState;
  retryPolicy: SettlementConnectorRetryPolicy;
  circuitBreaker: SettlementConnectorCircuitBreakerPolicy;
  timeoutMs: number;
  consecutiveFailures: number;
  lastFailureAt?: number;
  lastError?: string;
  lastFailure?: SettlementConnectorFailure;
  profile?: SettlementConnectorProfileSummary;
}

export interface ConnectorHealthReport extends SettlementConnectorHealth {
  connector: SettlementConnector;
  rail: SettlementRail;
}

export interface ManagedSettlementConnector {
  getHealth(): SettlementConnectorHealth;
  resetHealth(): void;
  hasExternalReference(externalReference: string): Promise<boolean>;
}

export interface StablecoinBridgeConnector extends ManagedSettlementConnector {
  submitStablecoinTransfer(
    input: StablecoinBridgeSettlementRequest,
  ): Promise<StablecoinBridgeSettlementResult>;
}

export interface LlmTokenMeteringConnector extends ManagedSettlementConnector {
  applyMeteringCredit(input: SettlementConnectorRequest): Promise<SettlementConnectorResult>;
}

export interface CloudCreditBillingConnector extends ManagedSettlementConnector {
  applyBillingCredit(input: SettlementConnectorRequest): Promise<SettlementConnectorResult>;
}

export interface ApiQuotaAllocationConnector extends ManagedSettlementConnector {
  allocateQuota(input: SettlementConnectorRequest): Promise<SettlementConnectorResult>;
}

export interface SettlementConnectors {
  stablecoinBridge: StablecoinBridgeConnector;
  llmTokenMetering: LlmTokenMeteringConnector;
  cloudCreditBilling: CloudCreditBillingConnector;
  apiQuotaAllocation: ApiQuotaAllocationConnector;
}

export type ReconciliationQueueState = "pending" | "failed" | "all";

export interface ReconciliationQueueRequest {
  state?: ReconciliationQueueState;
  connector?: SettlementConnector;
  settlementId?: string;
  idempotencyKey?: string;
  cursor?: string;
  limit?: number;
}

export interface ReconciliationQueueItem {
  settlementId: string;
  state: Exclude<ReconciliationQueueState, "all">;
  idempotencyKey?: string;
  pendingRecordCount: number;
  failedRecordCount: number;
  recordIds: string[];
  connectors: SettlementConnector[];
  oldestCreatedAt: number;
  updatedAt: number;
  lastError?: string;
  records: SettlementRecord[];
}

export interface ReconciliationQueuePage {
  items: ReconciliationQueueItem[];
  nextCursor?: string;
}

export type PendingSettlementReconciliation = ReconciliationQueueItem;

export interface UnreconciledSettlementView {
  settlementId: string;
  pendingRecordCount: number;
  recordIds: string[];
  connectors: SettlementConnector[];
  oldestCreatedAt: number;
  records: SettlementRecord[];
}

export interface ReconciliationCycleResult {
  startedAt: number;
  completedAt: number;
  scannedRecordCount: number;
  reconciledRecordCount: number;
  pendingRecordCount: number;
  reconciledRecordIds: string[];
  connectorHealth: ConnectorHealthReport[];
}

export interface ReconciliationSummary {
  pendingSettlementCount: number;
  pendingRecordCount: number;
  failedSettlementCount: number;
  failedRecordCount: number;
  connectorHealth: ConnectorHealthReport[];
}

export function buildCompensationModel(input: CompensationModelInput): CompensationModel {
  const mode = input.mode ?? "multi_asset";
  const legs = input.legs.map((leg, index) => ({
    ...leg,
    id: `leg-${index + 1}`,
  }));

  if (legs.length === 0) {
    throw new Error("Compensation model requires at least one leg");
  }

  if (mode === "single_asset") {
    const distinctAssets = new Set(legs.map((leg) => leg.assetId));
    if (distinctAssets.size > 1) {
      throw new Error("single_asset mode cannot include multiple assets");
    }
  }

  for (const leg of legs) {
    if (!Number.isFinite(leg.amount) || leg.amount <= 0) {
      throw new Error(`invalid compensation amount in ${leg.id}`);
    }
    if (!leg.payerId || !leg.payeeId) {
      throw new Error(`payer/payee required in ${leg.id}`);
    }
  }

  return {
    mode,
    settlementWindowSec: input.settlementWindowSec,
    legs,
    metadata: input.metadata,
  };
}

export function summarizeCompensationByAsset(model: CompensationModel): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const leg of model.legs) {
    totals[leg.assetId] = (totals[leg.assetId] ?? 0) + leg.amount;
  }
  return totals;
}

export function quoteCompensationInReference(
  model: CompensationModel,
  referenceAssetId: string,
  rates: AssetValuationRate[],
): ReferenceAssetQuote {
  const totalsByAsset = summarizeCompensationByAsset(model);
  const rateMap = new Map(rates.map((rate) => [`${rate.assetId}->${rate.referenceAssetId}`, rate.rate]));

  const convertedByAsset: Record<string, number> = {};
  const missingAssetIds: string[] = [];
  let totalInReference = 0;

  for (const [assetId, amount] of Object.entries(totalsByAsset)) {
    if (assetId === referenceAssetId) {
      convertedByAsset[assetId] = amount;
      totalInReference += amount;
      continue;
    }

    const rate = rateMap.get(`${assetId}->${referenceAssetId}`);
    if (rate === undefined) {
      missingAssetIds.push(assetId);
      continue;
    }

    const converted = amount * rate;
    convertedByAsset[assetId] = converted;
    totalInReference += converted;
  }

  return {
    referenceAssetId,
    totalsByAsset,
    convertedByAsset,
    totalInReference,
    missingAssetIds,
  };
}

export function buildSettlementPlan(
  model: CompensationModel,
  assets: CompensationAssetDescriptor[],
): SettlementLine[] {
  const totalsByAsset = summarizeCompensationByAsset(model);
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  return Object.entries(totalsByAsset)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([assetId, amount]) => {
      const asset = assetMap.get(assetId);
      if (!asset) {
        throw new Error(`unknown asset descriptor: ${assetId}`);
      }

      return {
        assetId,
        amount,
        rail: settlementRailForKind(asset.kind),
      };
    });
}

export function buildSettlementExecutionRequest(
  model: CompensationModel,
  input: {
    settlementId?: string;
    idempotencyKey: string;
  },
): SettlementExecutionRequest {
  if (!model.legs.length) {
    throw new Error("Settlement execution requires at least one compensation leg");
  }

  const idempotencyKey = input.idempotencyKey.trim();
  if (idempotencyKey.length === 0) {
    throw new Error("Settlement execution requires an idempotency key");
  }

  return {
    model,
    settlementId: input.settlementId,
    idempotencyKey,
  };
}

export function buildSettlementAuditQueryParams(
  filter: SettlementRecordFilter = {},
  page: SettlementRecordPageRequest = {},
): string {
  const query = new URLSearchParams();
  if (filter.settlementId) {
    query.set("settlementId", filter.settlementId);
  }
  if (filter.assetId) {
    query.set("assetId", filter.assetId);
  }
  if (filter.rail) {
    query.set("rail", filter.rail);
  }
  if (filter.payerId) {
    query.set("payerId", filter.payerId);
  }
  if (filter.payeeId) {
    query.set("payeeId", filter.payeeId);
  }
  if (filter.status) {
    query.set("status", filter.status);
  }
  if (filter.reconciledBy) {
    query.set("reconciledBy", filter.reconciledBy);
  }
  if (page.cursor) {
    query.set("cursor", page.cursor);
  }
  if (page.limit !== undefined) {
    query.set("limit", String(page.limit));
  }

  const suffix = query.toString();
  return suffix.length > 0 ? `?${suffix}` : "";
}

export function buildSettlementReplayQueryParams(input: SettlementRecordReplayRequest = {}): string {
  const query = new URLSearchParams();
  if (input.fromOffset !== undefined) {
    query.set("fromOffset", String(input.fromOffset));
  }
  if (input.limit !== undefined) {
    query.set("limit", String(input.limit));
  }

  const suffix = query.toString();
  return suffix.length > 0 ? `?${suffix}` : "";
}

export function buildReconciliationQueueQueryParams(input: ReconciliationQueueRequest = {}): string {
  const query = new URLSearchParams();
  if (input.state) {
    query.set("state", input.state);
  }
  if (input.connector) {
    query.set("connector", input.connector);
  }
  if (input.settlementId) {
    query.set("settlementId", input.settlementId);
  }
  if (input.idempotencyKey) {
    query.set("idempotencyKey", input.idempotencyKey);
  }
  if (input.cursor) {
    query.set("cursor", input.cursor);
  }
  if (input.limit !== undefined) {
    query.set("limit", String(input.limit));
  }

  const suffix = query.toString();
  return suffix.length > 0 ? `?${suffix}` : "";
}

function settlementRailForKind(kind: CompensationAssetKind): SettlementRail {
  switch (kind) {
    case "usdc":
    case "stablecoin":
      return "onchain_stablecoin";
    case "llm_token":
      return "llm_metering";
    case "cloud_credit":
      return "cloud_billing";
    case "api_quota":
      return "api_quota";
    default:
      return "custom";
  }
}
