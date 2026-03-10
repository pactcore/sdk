import { buildReconciliationQueueQueryParams, buildSettlementAuditQueryParams, buildSettlementReplayQueryParams, } from "./economics";
export class PactSdk {
    baseUrl;
    apiKey;
    extraHeaders;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, "");
        this.apiKey = options.apiKey;
        this.extraHeaders = options.headers ?? {};
        this.fetchImpl = options.fetchImpl ?? fetch;
    }
    async health() {
        return this.request("GET", "/health");
    }
    // ── Observability & admin ─────────────────────────────────────
    async getObservabilityHealth() {
        return this.request("GET", "/observability/health");
    }
    async getObservabilityMetrics() {
        return this.request("GET", "/observability/metrics");
    }
    async getObservabilityTraces(limit) {
        const suffix = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : "";
        return this.request("GET", `/observability/traces${suffix}`);
    }
    async replayEvents(fromOffset, limit) {
        const params = new URLSearchParams();
        if (fromOffset !== undefined) {
            params.set("fromOffset", String(fromOffset));
        }
        if (limit !== undefined) {
            params.set("limit", String(limit));
        }
        const query = params.toString();
        const suffix = query ? `?${query}` : "";
        return this.request("GET", `/events/replay${suffix}`);
    }
    async getNetworkAnalytics() {
        return this.request("GET", "/analytics/network");
    }
    async getTaskAnalytics(period) {
        const suffix = period ? `?period=${encodeURIComponent(period)}` : "";
        return this.request("GET", `/analytics/tasks${suffix}`);
    }
    async getEconomicsAnalytics() {
        return this.request("GET", "/analytics/economics");
    }
    async getSecurityAnalytics() {
        return this.request("GET", "/analytics/security");
    }
    async getEcosystemStatus() {
        return this.request("GET", "/ecosystem/status");
    }
    async getEcosystemModules() {
        return this.request("GET", "/ecosystem/modules");
    }
    async getEcosystemSynergy() {
        return this.request("GET", "/ecosystem/synergy");
    }
    async createApiKey(input) {
        return this.request("POST", "/admin/api-keys", input);
    }
    async listApiKeys(ownerId) {
        const query = `?ownerId=${encodeURIComponent(ownerId)}`;
        return this.request("GET", `/admin/api-keys${query}`);
    }
    async revokeApiKey(apiKeyId) {
        await this.request("DELETE", `/admin/api-keys/${encodeURIComponent(apiKeyId)}`);
    }
    async getUsageStats(apiKeyId) {
        const query = `?apiKeyId=${encodeURIComponent(apiKeyId)}`;
        return this.request("GET", `/admin/usage${query}`);
    }
    async getOverallUsageStats() {
        return this.request("GET", "/admin/usage/overall");
    }
    // ── Anti-spam ────────────────────────────────────────────────
    async checkAntiSpam(input) {
        return this.request("POST", "/anti-spam/check", input);
    }
    async recordAntiSpamAction(input) {
        return this.request("POST", "/anti-spam/record", input);
    }
    async getAntiSpamProfile(participantId) {
        return this.request("GET", `/anti-spam/${encodeURIComponent(participantId)}/profile`);
    }
    async getAntiSpamStake(participantId, action) {
        return this.request("GET", `/anti-spam/${encodeURIComponent(participantId)}/stake/${encodeURIComponent(action)}`);
    }
    async getSecurityThreats() {
        return this.request("GET", "/security/threats");
    }
    async runSecurityAudit(input) {
        return this.request("POST", "/security/audit", input);
    }
    async getSecuritySybilResistance(participantId) {
        return this.request("GET", `/security/sybil-resistance/${encodeURIComponent(participantId)}`);
    }
    // ── Role/participant matrix ──────────────────────────────────
    async getRoleCapabilities(role) {
        return this.request("GET", `/roles/${encodeURIComponent(role)}/capabilities`);
    }
    async getRoleRequirements(role) {
        return this.request("GET", `/roles/${encodeURIComponent(role)}/requirements`);
    }
    async checkRoleAction(input) {
        return this.request("POST", "/roles/check-action", input);
    }
    async getParticipantMatrixCategory(input) {
        return this.request("POST", "/participants/matrix/category", input);
    }
    // ── Reputation ────────────────────────────────────────────────
    async listReputationLeaderboard(category, limit) {
        const params = new URLSearchParams();
        if (category) {
            params.set("category", category);
        }
        if (limit !== undefined) {
            params.set("limit", String(limit));
        }
        const query = params.toString();
        const suffix = query ? `?${query}` : "";
        return this.request("GET", `/reputation/leaderboard${suffix}`);
    }
    async getReputation(participantId) {
        return this.request("GET", `/reputation/${encodeURIComponent(participantId)}`);
    }
    async recordReputationEvent(participantId, input) {
        return this.request("POST", `/reputation/${encodeURIComponent(participantId)}/events`, input);
    }
    async getReputationHistory(participantId, limit) {
        const suffix = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : "";
        return this.request("GET", `/reputation/${encodeURIComponent(participantId)}/history${suffix}`);
    }
    // ── PactID / DID ──────────────────────────────────────────────
    async registerParticipant(input) {
        return this.request("POST", "/id/participants", input);
    }
    async listWorkers() {
        return this.request("GET", "/id/workers");
    }
    async getDIDDocument(participantId) {
        return this.request("GET", `/id/did/${encodeURIComponent(participantId)}`);
    }
    async getOnchainIdentity(participantId) {
        return this.request("GET", `/id/onchain/${encodeURIComponent(participantId)}`);
    }
    async syncOnchainIdentity(participantId) {
        return this.request("POST", `/id/onchain/${encodeURIComponent(participantId)}/sync`, {});
    }
    async getParticipantLevel(participantId) {
        return this.request("GET", `/id/participants/${encodeURIComponent(participantId)}/level`);
    }
    async upgradeParticipantLevel(participantId) {
        return this.request("POST", `/id/participants/${encodeURIComponent(participantId)}/upgrade-level`, {});
    }
    async getParticipantStats(participantId) {
        return this.request("GET", `/id/participants/${encodeURIComponent(participantId)}/stats`);
    }
    async recordParticipantTaskCompleted(participantId) {
        return this.request("POST", `/id/participants/${encodeURIComponent(participantId)}/task-completed`, {});
    }
    async issueCredential(input) {
        return this.request("POST", "/id/credentials", input);
    }
    async verifyCredential(credential) {
        const payload = { credential };
        return this.request("POST", "/id/credentials/verify", payload);
    }
    async checkCapability(participantId, capability) {
        return this.request("GET", `/id/capabilities/${encodeURIComponent(participantId)}/${encodeURIComponent(capability)}`);
    }
    // ── ZK proofs ────────────────────────────────────────────────
    async createZKLocationProof(input) {
        return this.request("POST", "/zk/proofs/location", input);
    }
    async createZKCompletionProof(input) {
        return this.request("POST", "/zk/proofs/completion", input);
    }
    async createZKIdentityProof(input) {
        return this.request("POST", "/zk/proofs/identity", input);
    }
    async createZKReputationProof(input) {
        return this.request("POST", "/zk/proofs/reputation", input);
    }
    async verifyZKProof(proofId) {
        return this.request("POST", `/zk/proofs/${encodeURIComponent(proofId)}/verify`, {});
    }
    async getZKProof(proofId) {
        return this.request("GET", `/zk/proofs/${encodeURIComponent(proofId)}`);
    }
    async getZKProofReceipts(proofId) {
        return this.request("GET", `/zk/proofs/${encodeURIComponent(proofId)}/receipts`);
    }
    async getZKAdapterHealth() {
        return this.request("GET", "/zk/adapters/health");
    }
    async getZKBridgeRuntime() {
        return this.request("GET", "/zk/bridge/runtime");
    }
    async listZKArtifactManifests(type) {
        const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
        return this.request("GET", `/zk/manifests${suffix}`);
    }
    async getZKArtifactManifest(type, version) {
        const suffix = version ? `?version=${encodeURIComponent(version)}` : "";
        return this.request("GET", `/zk/manifests/${encodeURIComponent(type)}${suffix}`);
    }
    async getZKCircuitDefinition(type) {
        return this.request("GET", `/zk/circuits/${encodeURIComponent(type)}`);
    }
    async formalVerifyZKProof(proofId) {
        return this.request("POST", `/zk/formal-verify/${encodeURIComponent(proofId)}`, {});
    }
    // ── Tasks ────────────────────────────────────────────────────
    async createTask(input) {
        return this.request("POST", "/tasks", input);
    }
    async assignTask(taskId, workerId) {
        return this.request("POST", `/tasks/${encodeURIComponent(taskId)}/assign`, workerId ? { workerId } : {});
    }
    async submitTask(taskId, input) {
        return this.request("POST", `/tasks/${encodeURIComponent(taskId)}/submit`, input);
    }
    async listTasks() {
        return this.request("GET", "/tasks");
    }
    async getTask(taskId) {
        return this.request("GET", `/tasks/${encodeURIComponent(taskId)}`);
    }
    async createMission(input) {
        return this.request("POST", "/missions", input);
    }
    async listMissions() {
        return this.request("GET", "/missions");
    }
    async getMission(missionId) {
        return this.request("GET", `/missions/${encodeURIComponent(missionId)}`);
    }
    async claimMission(missionId, agentId) {
        return this.request("POST", `/missions/${encodeURIComponent(missionId)}/claim`, { agentId });
    }
    async appendMissionStep(missionId, input) {
        return this.request("POST", `/missions/${encodeURIComponent(missionId)}/steps`, input);
    }
    async submitMissionEvidence(missionId, input) {
        return this.request("POST", `/missions/${encodeURIComponent(missionId)}/evidence`, input);
    }
    async recordMissionVerdict(missionId, input) {
        return this.request("POST", `/missions/${encodeURIComponent(missionId)}/verdict`, input);
    }
    async openMissionChallenge(missionId, input) {
        return this.request("POST", `/missions/${encodeURIComponent(missionId)}/challenges`, input);
    }
    async resolveMissionChallenge(missionId, challengeId, input) {
        return this.request("POST", `/missions/${encodeURIComponent(missionId)}/challenges/${encodeURIComponent(challengeId)}/resolve`, input);
    }
    // ── Payment routing ──────────────────────────────────────────
    async routePayment(input) {
        return this.request("POST", "/pay/route", {
            fromId: input.fromId,
            toId: input.toId,
            amount: input.amount,
            currency: input.currency,
            reference: input.reference,
        });
    }
    async relayX402Payment(input) {
        return this.request("POST", "/pay/x402/relay", {
            fromId: input.fromId ?? input.from,
            toId: input.toId ?? input.to,
            amountCents: input.amountCents ?? input.amount,
            gasSponsored: input.gasSponsored ?? false,
        });
    }
    async getX402GasStats(beneficiaryId) {
        return this.request("GET", `/pay/x402/gas-stats/${encodeURIComponent(beneficiaryId)}`);
    }
    async listPaymentRoutes() {
        return this.request("GET", "/pay/routes");
    }
    async addMicropayment(input) {
        return this.request("POST", "/pay/micropayments", input);
    }
    async flushMicropayments(payerId) {
        return this.request("POST", "/pay/micropayments/flush", { payerId });
    }
    async openCreditLine(input) {
        return this.request("POST", "/pay/credit-lines", input);
    }
    async useCreditLine(creditLineId, amountCents) {
        return this.request("POST", `/pay/credit-lines/${encodeURIComponent(creditLineId)}/use`, { amountCents });
    }
    async repayCreditLine(creditLineId, amountCents) {
        return this.request("POST", `/pay/credit-lines/${encodeURIComponent(creditLineId)}/repay`, { amountCents });
    }
    async grantGasSponsorship(input) {
        return this.request("POST", "/pay/gas-sponsorship", input);
    }
    async useGasSponsorship(grantId, gasCents) {
        return this.request("POST", `/pay/gas-sponsorship/${encodeURIComponent(grantId)}/use`, { gasCents });
    }
    async getLedger() {
        return this.request("GET", "/payments/ledger");
    }
    // ── Token economics ───────────────────────────────────────────
    async getTokenDistribution() {
        return this.request("GET", "/economics/token/distribution");
    }
    async getTokenSupply(months) {
        const suffix = months !== undefined ? `?months=${encodeURIComponent(String(months))}` : "";
        return this.request("GET", `/economics/token/supply${suffix}`);
    }
    async calculateTokenApy(input) {
        return this.request("POST", "/economics/token/apy", input);
    }
    async calculateTokenBurnRate(input) {
        return this.request("POST", "/economics/token/burn-rate", input);
    }
    async registerEconomicsAsset(input) {
        return this.request("POST", "/economics/assets", input);
    }
    async listEconomicsAssets() {
        return this.request("GET", "/economics/assets");
    }
    async quoteEconomicsCompensation(model) {
        return this.request("POST", "/economics/quote", model);
    }
    async registerCompensationValuation(input) {
        return this.request("POST", "/economics/valuations", input);
    }
    async listCompensationValuations(referenceAssetId) {
        const suffix = referenceAssetId
            ? `?referenceAssetId=${encodeURIComponent(referenceAssetId)}`
            : "";
        return this.request("GET", `/economics/valuations${suffix}`);
    }
    async quoteCompensationInReference(model, referenceAssetId) {
        return this.request("POST", "/economics/quote-reference", { model, referenceAssetId });
    }
    async planCompensationSettlement(model) {
        return this.request("POST", "/economics/settlement-plan", model);
    }
    // ── Settlements (economics) ─────────────────────────────────
    async executeSettlement(input) {
        return this.request("POST", "/economics/settlements/execute", input, { "Idempotency-Key": input.idempotencyKey });
    }
    async getEconomicsConnectorHealth() {
        return this.request("GET", "/economics/connectors/health");
    }
    async resetEconomicsConnector(connectorId) {
        return this.request("POST", `/economics/connectors/${encodeURIComponent(connectorId)}/reset`);
    }
    async runReconciliationCycle() {
        return this.request("POST", "/economics/reconciliation/run");
    }
    async queryReconciliationQueue(input = {}) {
        const suffix = buildReconciliationQueueQueryParams(input);
        return this.request("GET", `/economics/reconciliation/queue${suffix}`);
    }
    async getReconciliationSummary() {
        return this.request("GET", "/economics/reconciliation/summary");
    }
    async listPendingReconciliationSettlements(input = {}) {
        const suffix = buildReconciliationQueueQueryParams({
            ...input,
            state: "pending",
        });
        const page = await this.request("GET", `/economics/reconciliation/pending${suffix}`);
        return page.items;
    }
    async listUnreconciledSettlements() {
        return this.request("GET", "/economics/reconciliation/unreconciled");
    }
    async listSettlementRecords(filter) {
        const suffix = buildSettlementAuditQueryParams(filter);
        const path = `/economics/settlements/records${suffix}`;
        return this.request("GET", path);
    }
    async querySettlementAuditRecords(filter, page) {
        const suffix = buildSettlementAuditQueryParams(filter, page);
        return this.request("GET", `/economics/settlements/records/page${suffix}`);
    }
    async querySettlementReconciliationRecords(filter, page) {
        return this.querySettlementAuditRecords({
            ...filter,
            status: filter?.status ?? "reconciled",
        }, page);
    }
    async replaySettlementRecordLifecycle(input) {
        const suffix = buildSettlementReplayQueryParams(input);
        return this.request("GET", `/economics/settlements/records/replay${suffix}`);
    }
    async reconcileSettlementRecord(recordId, input) {
        return this.request("POST", `/economics/settlements/records/${encodeURIComponent(recordId)}/reconcile`, input ?? {});
    }
    async getSettlementRecord(recordId) {
        return this.request("GET", `/economics/settlements/records/${encodeURIComponent(recordId)}`);
    }
    // ── Governance & rewards ────────────────────────────────────
    async createGovernanceProposal(input) {
        return this.request("POST", "/governance/proposals", input);
    }
    async voteOnGovernanceProposal(proposalId, input) {
        return this.request("POST", `/governance/proposals/${encodeURIComponent(proposalId)}/vote`, input);
    }
    async executeGovernanceProposal(proposalId, input) {
        return this.request("POST", `/governance/proposals/${encodeURIComponent(proposalId)}/execute`, input);
    }
    async distributeEpochRewards(epoch, input) {
        return this.request("POST", `/rewards/epochs/${encodeURIComponent(String(epoch))}/distribute`, input);
    }
    async getParticipantRewards(participantId) {
        return this.request("GET", `/rewards/${encodeURIComponent(participantId)}`);
    }
    async getOnchainFinalitySummary() {
        return this.request("GET", "/onchain/finality/summary");
    }
    async listOnchainTransactions(query = {}) {
        const suffix = buildOnchainTransactionQueryParams(query);
        return this.request("GET", `/onchain/finality/transactions${suffix}`);
    }
    async getOnchainTransaction(txId) {
        return this.request("GET", `/onchain/finality/transactions/${encodeURIComponent(txId)}`);
    }
    async trackOnchainTransaction(input) {
        return this.request("POST", "/onchain/finality/transactions", input);
    }
    async recordOnchainTransactionInclusion(input) {
        const { txId, ...body } = input;
        return this.request("POST", `/onchain/finality/transactions/${encodeURIComponent(txId)}/inclusion`, body);
    }
    async recordCanonicalBlock(input) {
        await this.request("POST", "/onchain/finality/blocks/canonical", input);
    }
    // ── PactCompute ─────────────────────────────────────────────
    async registerComputeProvider(provider) {
        return this.request("POST", "/compute/providers", provider);
    }
    async listComputeProviders() {
        return this.request("GET", "/compute/providers");
    }
    async findComputeProviders(minCpu, minMemory, minGpu) {
        const params = new URLSearchParams({
            minCpu: String(minCpu),
            minMemory: String(minMemory),
        });
        if (minGpu !== undefined) {
            params.set("minGpu", String(minGpu));
        }
        return this.request("GET", `/compute/providers/search?${params}`);
    }
    async listComputePricingTiers() {
        return this.request("GET", "/compute/pricing/tiers");
    }
    async quoteComputePricing(input) {
        return this.request("POST", "/compute/pricing/quote", {
            capabilities: input.capabilities,
            durationSeconds: input.durationSeconds,
        });
    }
    async enqueueComputeJob(input) {
        return this.request("POST", "/compute/jobs", input);
    }
    async dispatchComputeJob(jobId, providerId) {
        return this.request("POST", `/compute/jobs/${encodeURIComponent(jobId)}/dispatch`, providerId ? { providerId } : {});
    }
    async getComputeUsageRecords(jobId) {
        const suffix = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
        return this.request("GET", `/compute/usage${suffix}`);
    }
    async getComputeAdapterHealth() {
        return this.request("GET", "/compute/adapters/health");
    }
    async getComputeManagedBackendHealth() {
        return this.request("GET", "/compute/backends/health");
    }
    async registerHeartbeatTask(input) {
        return this.request("POST", "/heartbeat/tasks", input);
    }
    async listHeartbeatTasks() {
        return this.request("GET", "/heartbeat/tasks");
    }
    async enableHeartbeatTask(taskId) {
        return this.request("POST", `/heartbeat/tasks/${encodeURIComponent(taskId)}/enable`, {});
    }
    async disableHeartbeatTask(taskId) {
        return this.request("POST", `/heartbeat/tasks/${encodeURIComponent(taskId)}/disable`, {});
    }
    async tickHeartbeat(now) {
        return this.request("POST", "/heartbeat/tick", now === undefined ? {} : { now });
    }
    // ── PactData ────────────────────────────────────────────────
    async publishDataAsset(input) {
        return this.request("POST", "/data/assets", input);
    }
    async listDataAssets() {
        return this.request("GET", "/data/assets");
    }
    async getDataAssetLineage(assetId) {
        return this.request("GET", `/data/assets/${encodeURIComponent(assetId)}/lineage`);
    }
    async getDataAssetDependents(assetId) {
        return this.request("GET", `/data/assets/${encodeURIComponent(assetId)}/dependents`);
    }
    async registerIntegrityProof(assetId, contentHash) {
        return this.request("POST", `/data/assets/${encodeURIComponent(assetId)}/integrity`, { contentHash });
    }
    async verifyDataIntegrity(assetId, contentHash) {
        return this.request("POST", `/data/assets/${encodeURIComponent(assetId)}/integrity/verify`, { contentHash });
    }
    async setDataAccessPolicy(assetId, allowedParticipantIds, isPublic) {
        return this.request("PUT", `/data/assets/${encodeURIComponent(assetId)}/access`, { allowedParticipantIds, isPublic });
    }
    async checkDataAccess(assetId, participantId) {
        return this.request("GET", `/data/assets/${encodeURIComponent(assetId)}/access/${encodeURIComponent(participantId)}`);
    }
    async getDataAdapterHealth() {
        return this.request("GET", "/data/adapters/health");
    }
    async getDataManagedBackendHealth() {
        return this.request("GET", "/data/backends/health");
    }
    async createDataListing(input) {
        return this.request("POST", "/data/marketplace/list", input);
    }
    async delistDataListing(listingId) {
        await this.request("DELETE", `/data/marketplace/listings/${encodeURIComponent(listingId)}`);
    }
    async listDataListings(category) {
        const suffix = category ? `?category=${encodeURIComponent(category)}` : "";
        return this.request("GET", `/data/marketplace/listings${suffix}`);
    }
    async purchaseDataListing(input) {
        return this.request("POST", "/data/marketplace/purchase", input);
    }
    async getDataMarketplaceStats() {
        return this.request("GET", "/data/marketplace/stats");
    }
    // ── PactDev ─────────────────────────────────────────────────
    async publishPlugin(input) {
        return this.request("POST", "/dev/plugins/publish", input);
    }
    async listPlugins() {
        return this.request("GET", "/dev/plugins");
    }
    async installPlugin(pluginId, installerId) {
        return this.request("POST", `/dev/plugins/${encodeURIComponent(pluginId)}/install`, { installerId });
    }
    async recordPluginRevenue(pluginId, revenueCents) {
        return this.request("POST", `/dev/plugins/${encodeURIComponent(pluginId)}/revenue`, { revenueCents });
    }
    async getDeveloperPluginPayouts(developerId) {
        return this.request("GET", `/dev/plugins/payouts/${encodeURIComponent(developerId)}`);
    }
    async registerDevIntegration(input) {
        return this.request("POST", "/dev/integrations", input);
    }
    async listDevIntegrations() {
        return this.request("GET", "/dev/integrations");
    }
    async activateIntegration(id) {
        return this.request("POST", `/dev/integrations/${encodeURIComponent(id)}/activate`);
    }
    async suspendIntegration(id) {
        return this.request("POST", `/dev/integrations/${encodeURIComponent(id)}/suspend`);
    }
    async deprecateIntegration(id) {
        return this.request("POST", `/dev/integrations/${encodeURIComponent(id)}/deprecate`);
    }
    async getDevIntegrationHealth() {
        return this.request("GET", "/dev/integrations/health");
    }
    async getDevManagedBackendHealth() {
        return this.request("GET", "/dev/backends/health");
    }
    async listPolicies() {
        return this.request("GET", "/dev/policies");
    }
    async registerPolicy(pkg) {
        return this.request("POST", "/dev/policies", pkg);
    }
    async evaluatePolicy(context) {
        return this.request("POST", "/dev/policies/evaluate", context);
    }
    async registerTemplate(input) {
        return this.request("POST", "/dev/templates", input);
    }
    async listTemplates() {
        return this.request("GET", "/dev/templates");
    }
    // ── Disputes ──────────────────────────────────────────────────
    async createDispute(input) {
        return this.request("POST", "/disputes", input);
    }
    async listDisputes(status) {
        const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
        return this.request("GET", `/disputes${suffix}`);
    }
    async getDispute(disputeId) {
        return this.request("GET", `/disputes/${encodeURIComponent(disputeId)}`);
    }
    async submitDisputeEvidence(disputeId, input) {
        return this.request("POST", `/disputes/${encodeURIComponent(disputeId)}/evidence`, input);
    }
    async voteOnDispute(disputeId, input) {
        return this.request("POST", `/disputes/${encodeURIComponent(disputeId)}/vote`, input);
    }
    async resolveDispute(disputeId) {
        return this.request("POST", `/disputes/${encodeURIComponent(disputeId)}/resolve`, {});
    }
    async request(method, path, body, headers) {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method,
            headers: {
                "content-type": "application/json",
                ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
                ...this.extraHeaders,
                ...headers,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`PACT SDK request failed (${response.status}): ${message}`);
        }
        if (response.status === 204) {
            return undefined;
        }
        return (await response.json());
    }
}
function buildOnchainTransactionQueryParams(query = {}) {
    const params = new URLSearchParams();
    if (query.status) {
        params.set("status", query.status);
    }
    if (query.operation) {
        params.set("operation", query.operation);
    }
    if (query.participantId) {
        params.set("participantId", query.participantId);
    }
    if (query.proposalId) {
        params.set("proposalId", query.proposalId);
    }
    if (query.epoch !== undefined) {
        params.set("epoch", String(query.epoch));
    }
    if (query.referenceId) {
        params.set("referenceId", query.referenceId);
    }
    if (query.cursor) {
        params.set("cursor", query.cursor);
    }
    if (query.limit !== undefined) {
        params.set("limit", String(query.limit));
    }
    const suffix = params.toString();
    return suffix.length > 0 ? `?${suffix}` : "";
}
