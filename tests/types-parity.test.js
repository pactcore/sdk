import { describe, expect, it } from "bun:test";
describe("Type parity contracts", () => {
    it("models managed backend adapter inventory contracts", async () => {
        const queue = {
            domain: "compute",
            capability: "queue",
            mode: "remote",
            durability: "remote",
            async enqueue(message) {
                return {
                    messageId: message.id,
                    backendMessageId: "backend-msg-1",
                    acceptedAt: message.createdAt,
                    state: "queued",
                    metadata: { topic: message.topic },
                };
            },
            getDepth() {
                return { available: 2, inFlight: 1, scheduled: 1 };
            },
        };
        const store = {
            domain: "data",
            capability: "store",
            mode: "remote",
            async put() {
                return;
            },
            async get(key) {
                return {
                    key,
                    value: { value: "stored" },
                    updatedAt: 1700000000000,
                    etag: "etag-1",
                };
            },
        };
        const observability = {
            domain: "dev",
            capability: "observability",
            mode: "local",
            async recordMetric() {
                return;
            },
            async recordTrace() {
                return;
            },
        };
    const inventory = {
        compute: { queue },
        data: { store },
        dev: { observability },
    };
    const health = {
        name: "dev-observability-backend",
        domain: "dev",
        capability: "observability",
        mode: "local",
        state: "healthy",
        checkedAt: 1700000000100,
        features: {
            compatibilityChecks: true,
            runtimeVersion: "0.2.0",
        },
    };
    const receipt = await inventory.compute?.queue?.enqueue({
        id: "msg-1",
        topic: "jobs.run",
        payload: { jobId: "job-1" },
        createdAt: 1700000000000,
    });
    expect(receipt?.state).toBe("queued");
    expect(health.features?.compatibilityChecks).toBe(true);
    expect(health.features?.runtimeVersion).toBe("0.2.0");
    expect((await inventory.data?.store?.get("artifact-1"))?.etag).toBe("etag-1");
  });
    it("models dev integration health adapter surfaces", () => {
        const integrationHealth = {
            name: "managed-sdk",
            integrationId: "dev-1",
            integrationStatus: "suspended",
            state: "degraded",
            checkedAt: 1700000000200,
            webhookConfigured: true,
            version: "1.2.3",
            compatibility: {
                compatible: false,
                currentVersion: "0.2.0",
                supportedVersions: ["^0.3.0"],
                reason: "Runtime version is outside the declared compatibility set",
            },
            features: {
                versionChecks: true,
                operationalHooks: true,
            },
            lastError: {
                adapter: "dev",
                operation: "get_integration_health",
                code: "integration_version_mismatch",
                message: "managed SDK version is incompatible",
                retryable: false,
                occurredAt: 1700000000100,
            },
        };
        const summary = {
            status: "degraded",
            checkedAt: 1700000000300,
            runtimeVersion: "0.2.0",
            adapters: [integrationHealth],
            integrations: [integrationHealth],
        };
        expect(summary.integrations[0]?.name).toBe("managed-sdk");
        expect(summary.integrations[0]?.compatibility?.compatible).toBe(false);
        expect(summary.integrations[0]?.features?.operationalHooks).toBe(true);
        expect(summary.integrations[0]?.lastError?.code).toBe("integration_version_mismatch");
    });
    it("models Appendix C manifest and bridge runtime fields", () => {
        const manifest = {
            id: "manifest-1",
            schemaVersion: "1.0.0",
            proofType: "identity",
            manifestVersion: "1.0.0",
            runtimeVersion: "0.2.0",
            integrityAlgorithm: "sha256",
            circuit: {
                name: "identity-proof",
                version: "1.0.0",
                provingSystem: "groth16",
            },
            artifacts: [
                {
                    role: "wasm",
                    uri: "https://artifacts.pact/identity.wasm",
                    version: "1.0.0",
                    integrity: "sha256:artifact",
                    integrityAlgorithm: "sha256",
                    source: "remote",
                },
            ],
            createdAt: 1700000000000,
            publishedAt: 1700000001000,
            artifactCount: 1,
            manifestIntegrity: "sha256:manifest",
        };
        const runtime = {
            adapter: "appendix-c-adapter",
            runtimeVersion: "0.2.0",
            durability: "remote",
            manifestCatalog: {
                schemaVersions: ["1.0.0"],
                manifestsByType: { identity: ["1.0.0"] },
            },
            features: {
                manifestVersioning: true,
                artifactIntegrity: true,
                receiptTraceability: true,
                deterministicLocalAdapter: false,
                remoteAdapterSkeleton: true,
            },
        };
        const proof = {
            id: "zk-1",
            type: "identity",
            proverId: "worker-1",
            commitment: "commitment",
            publicInputs: { participantId: "worker-1" },
            proof: "proof-bytes",
            verified: true,
            createdAt: 1700000000000,
            bridge: {
                adapter: runtime.adapter,
                manifestId: manifest.id,
                manifestVersion: manifest.manifestVersion,
                manifestIntegrity: manifest.manifestIntegrity,
                manifestSchemaVersion: manifest.schemaVersion,
                runtimeVersion: runtime.runtimeVersion,
                traceId: "trace-1",
                proofDigest: "sha256:proof",
                publicInputsDigest: "sha256:inputs",
                adapterReceiptId: "receipt-1",
            },
        };
    expect(manifest.artifacts[0]?.source).toBe("remote");
    expect(proof.bridge?.manifestSchemaVersion).toBe("1.0.0");
    expect(runtime.features.receiptTraceability).toBe(true);
    });
    it("models Appendix C adapter health metadata", () => {
        const adapterHealth = {
            name: "zk-prover-bridge",
            state: "degraded",
            checkedAt: 1700000000100,
            durability: "remote",
            features: {
                manifestCatalog: true,
                manifestCatalogState: "unhealthy",
                providerId: "appendix-c-provider",
                requiredCredentialFields: ["accessToken"],
                runtimeVersion: "0.2.0",
                remoteAdapterSkeleton: true,
            },
            lastError: {
                adapter: "zk",
                operation: "configure_remote_bridge",
                code: "zk_remote_endpoint_missing",
                message: "remote endpoint missing",
                retryable: false,
                occurredAt: 1700000000101,
            },
        };
        const summary = {
            status: "degraded",
            checkedAt: 1700000000200,
            runtimeVersion: "0.2.0",
            adapters: [adapterHealth],
        };
        const requiredCredentialFields = summary.adapters[0]?.features?.requiredCredentialFields;
        expect(summary.adapters[0]?.features?.providerId).toBe("appendix-c-provider");
        expect(summary.adapters[0]?.features?.manifestCatalogState).toBe("unhealthy");
        expect(summary.adapters[0]?.features?.remoteAdapterSkeleton).toBe(true);
        expect(Array.isArray(requiredCredentialFields)).toBe(true);
        if (!Array.isArray(requiredCredentialFields)) {
            throw new Error("expected Appendix C credential field metadata");
        }
        expect(requiredCredentialFields[0]).toBe("accessToken");
    });
    it("models settlement connector transport and contract surfaces", async () => {
        const transport = {
            async send(request) {
                return {
                    status: 200,
                    body: { connector: request.connector, acknowledged: true },
                    headers: { "x-connector": request.connector },
                };
            },
        };
        const request = {
            settlementId: "settlement-1",
            recordId: "record-1",
            legId: "leg-1",
            assetId: "llm-gpt5",
            amount: 42,
            unit: "token",
            payerId: "issuer-1",
            payeeId: "agent-1",
            idempotencyKey: "idem-1",
            metadata: { ledger: "primary" },
        };
        const stablecoinRequest = {
            settlementId: "settlement-onchain-1",
            recordId: "record-onchain-1",
            legId: "leg-onchain-1",
            assetId: "usdc-mainnet",
            amount: 25,
            unit: "USDC",
            payerId: "issuer-1",
            payeeId: "agent-1",
            externalReference: "0xtx-1",
            idempotencyKey: "idem-onchain-1",
            connectorMetadata: { bridge: "mainnet-usdc" },
            chainId: 1,
            network: "ethereum",
            tokenAddress: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            fromAddress: "0x1111111111111111111111111111111111111111",
            toAddress: "0x2222222222222222222222222222222222222222",
        };
        const connectors = {
            stablecoinBridge: {
                async getHealth() {
                    return {
                        adapter: "stablecoin-mainnet-bridge",
                        state: "closed",
                        checkedAt: 1700000000000,
                        durable: true,
                        durability: "remote",
                        features: { liveSettlement: true, onchainFinality: true },
                        compatibility: {
                            compatible: true,
                            currentVersion: "0.2.1",
                            supportedVersions: ["^0.2.0"],
                        },
                        profile: {
                            profileId: "mainnet-usdc",
                            providerId: "circle",
                            endpoint: "https://settlement.example/bridge",
                            timeoutMs: 5000,
                            credentialType: "api_key",
                            configuredCredentialFields: ["token"],
                            metadata: { network: "ethereum" },
                        },
                        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
                        circuitBreaker: { failureThreshold: 5, cooldownMs: 60000 },
                        timeoutMs: 5000,
                        consecutiveFailures: 0,
                    };
                },
                async resetHealth() {
                    return;
                },
                async hasExternalReference(externalReference) {
                    return externalReference === stablecoinRequest.externalReference;
                },
                async submitStablecoinTransfer(input) {
                    return {
                        status: "applied",
                        externalReference: input.externalReference ?? "0xtx-1",
                        processedAt: 1700000001500,
                        idempotencyKey: input.idempotencyKey,
                        connectorMetadata: input.connectorMetadata,
                        transactionHash: input.externalReference ?? "0xtx-1",
                        chainId: input.chainId,
                        network: input.network,
                        blockNumber: 123,
                    };
                },
            },
            llmTokenMetering: {
                getHealth() {
                    return {
                        adapter: "llm-live-connector",
                        state: "closed",
                        checkedAt: 1700000000000,
                        durable: true,
                        durability: "remote",
                        features: { liveSettlement: true, runtimeVersion: "0.2.1" },
                        compatibility: {
                            compatible: true,
                            currentVersion: "0.2.1",
                            supportedVersions: ["^0.2.0"],
                        },
                        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
                        circuitBreaker: { failureThreshold: 5, cooldownMs: 60000 },
                        timeoutMs: 5000,
                        consecutiveFailures: 0,
                    };
                },
                resetHealth() {
                    return;
                },
                async hasExternalReference(externalReference) {
                    return externalReference === "ext-1";
                },
                async applyMeteringCredit(input) {
                    return {
                        status: "applied",
                        externalReference: `metering:${input.recordId}`,
                        processedAt: 1700000002000,
                        idempotencyKey: input.idempotencyKey,
                        metadata: input.metadata,
                    };
                },
            },
            cloudCreditBilling: {
                getHealth() {
                    return {
                        state: "closed",
                        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
                        circuitBreaker: { failureThreshold: 5, cooldownMs: 60000 },
                        timeoutMs: 5000,
                        consecutiveFailures: 0,
                    };
                },
                resetHealth() {
                    return;
                },
                async hasExternalReference() {
                    return false;
                },
                async applyBillingCredit(input) {
                    return {
                        status: "applied",
                        externalReference: `billing:${input.recordId}`,
                        processedAt: 1700000002000,
                    };
                },
            },
            apiQuotaAllocation: {
                getHealth() {
                    return {
                        state: "closed",
                        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
                        circuitBreaker: { failureThreshold: 5, cooldownMs: 60000 },
                        timeoutMs: 5000,
                        consecutiveFailures: 0,
                    };
                },
                resetHealth() {
                    return;
                },
                async hasExternalReference() {
                    return false;
                },
                async allocateQuota(input) {
                    return {
                        status: "applied",
                        externalReference: `quota:${input.recordId}`,
                        processedAt: 1700000002000,
                    };
                },
            },
        };
        const response = await transport.send({
            connector: "llm_token_metering",
            operation: "apply_metering_credit",
            method: "POST",
            url: "https://connector.pact/apply",
            headers: { authorization: "Bearer token" },
            body: JSON.stringify(request),
            timeoutMs: 5000,
        });
        const result = await connectors.llmTokenMetering.applyMeteringCredit(request);
        const stablecoinResult = await connectors.stablecoinBridge.submitStablecoinTransfer(stablecoinRequest);
        const llmHealth = await connectors.llmTokenMetering.getHealth();
        const stablecoinHealth = await connectors.stablecoinBridge.getHealth();
        expect(response.status).toBe(200);
        expect(result.status).toBe("applied");
        expect(result.externalReference).toBe("metering:record-1");
        expect(result.metadata?.ledger).toBe("primary");
        expect(result.idempotencyKey).toBe("idem-1");
        expect(stablecoinResult.status).toBe("applied");
        expect(stablecoinResult.transactionHash).toBe("0xtx-1");
        expect(stablecoinResult.chainId).toBe(1);
        expect(llmHealth.features?.runtimeVersion).toBe("0.2.1");
        expect(stablecoinHealth.profile?.metadata?.network).toBe("ethereum");
        expect(await connectors.llmTokenMetering.hasExternalReference("ext-1")).toBe(true);
        expect(await connectors.stablecoinBridge.hasExternalReference("0xtx-1")).toBe(true);
    });
    it("models onchain finality provider and signer contracts", async () => {
        const tracked = {
            txId: "0xtx-1",
            operation: "governance_proposal_create",
            status: "submitted",
            submittedAt: 1700000000000,
            lastUpdatedAt: 1700000000000,
            confirmations: 0,
            confirmationDepth: 12,
            finalityDepth: 32,
            participantId: "council-1",
            referenceId: "proposal-1",
        };
        const summary = {
            trackedTransactionCount: 1,
            submittedCount: 0,
            confirmedCount: 1,
            finalizedCount: 0,
            reorgedCount: 0,
            headBlockNumber: 111,
            confirmationDepth: 12,
            finalityDepth: 32,
        };
        const provider = {
            async trackTransaction(input) {
                return {
                    ...tracked,
                    txId: input.txId,
                    operation: input.operation,
                    participantId: input.participantId,
                    referenceId: input.referenceId,
                    submittedAt: input.submittedAt ?? tracked.submittedAt,
                    lastUpdatedAt: input.submittedAt ?? tracked.submittedAt,
                };
            },
            async recordTransactionInclusion(input) {
                return {
                    ...tracked,
                    status: "confirmed",
                    blockNumber: input.blockNumber,
                    blockHash: input.blockHash,
                    includedAt: input.includedAt ?? 1700000001000,
                    lastUpdatedAt: input.includedAt ?? 1700000001000,
                    confirmations: 1,
                };
            },
            async recordCanonicalBlock() {
                return;
            },
            async advanceHead() {
                return summary;
            },
            async getTransaction() {
                return tracked;
            },
            async listTransactions() {
                return { items: [tracked] };
            },
            async getSummary() {
                return summary;
            },
        };
        const signer = {
            async getAddress() {
                return "0xsigner";
            },
            async signTransaction(payload) {
                return `${payload.to}:${payload.nonce}`;
            },
        };
        const inclusion = await provider.recordTransactionInclusion({
            txId: "0xtx-1",
            blockNumber: 111,
            blockHash: "0xblock",
        });
        const onchainSummary = await provider.getSummary();
        const signerAddress = await signer.getAddress();
        const signature = await signer.signTransaction({
            to: "0xcore",
            data: "0xdeadbeef",
            nonce: 7,
        });
        expect(inclusion.status).toBe("confirmed");
        expect(onchainSummary.headBlockNumber).toBe(111);
        expect(signerAddress).toBe("0xsigner");
        expect(signature).toBe("0xcore:7");
    });
});
