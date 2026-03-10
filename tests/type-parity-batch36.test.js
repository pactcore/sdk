import { describe, expect, it } from "bun:test";
describe("SDK type parity - batch 36 bridge contracts", () => {
    it("supports managed backend adapter contract shapes", async () => {
        const queue = {
            domain: "compute",
            capability: "queue",
            mode: "remote",
            durability: "remote",
            async enqueue(message) {
                return {
                    messageId: message.id,
                    backendMessageId: "backend-job-1",
                    acceptedAt: message.createdAt,
                    state: "queued",
                };
            },
            getDepth() {
                return { available: 1, scheduled: 0 };
            },
        };
        const store = {
            domain: "compute",
            capability: "store",
            mode: "local",
            async put() { },
            async get(key) {
                return {
                    key,
                    value: { status: "ok" },
                    updatedAt: 1_700_000_000_000,
                };
            },
        };
        const trace = {
            traceId: "trace-1",
            spanId: "span-1",
            name: "compute.exec",
            startedAt: 1_700_000_000_000,
            status: "ok",
            attributes: { queuedMessages: 1 },
        };
        const inventory = {
            compute: {
                queue,
                store,
            },
        };
        const receipt = await inventory.compute?.queue?.enqueue({
            id: "job-1",
            topic: "compute.exec",
            payload: { taskId: "task-1" },
            createdAt: 1_700_000_000_000,
        });
        expect(receipt?.state).toBe("queued");
        expect(trace.attributes?.queuedMessages).toBe(1);
        expect((await store.get("checkpoint-1"))?.value.status).toBe("ok");
    });
    it("supports settlement and onchain bridge contract shapes", async () => {
        const profile = {
            id: "openai-live",
            providerId: "openai",
            endpoint: "https://billing.example.test/llm",
            credentialSchema: {
                type: "bearer",
                fields: [{ key: "token", required: true, secret: true }],
            },
            credentials: { token: "secret" },
        };
        const health = {
            state: "closed",
            retryPolicy: {
                maxRetries: 3,
                backoffMs: 500,
                backoffStrategy: "exponential",
                maxBackoffMs: 4_000,
            },
            circuitBreaker: { failureThreshold: 5, cooldownMs: 60_000 },
            timeoutMs: 2_000,
            consecutiveFailures: 0,
            profile: {
                profileId: profile.id,
                providerId: profile.providerId,
                endpoint: profile.endpoint,
                credentialType: profile.credentialSchema.type,
                configuredCredentialFields: ["token"],
            },
        };
        const transportRequest = {
            connector: "llm_token_metering",
            operation: "apply_metering_credit",
            method: "POST",
            url: profile.endpoint,
            headers: { authorization: "Bearer secret" },
            body: JSON.stringify({ settlementId: "settlement-1" }),
            timeoutMs: health.timeoutMs,
        };
        const transportResponse = {
            status: 201,
            body: { externalReference: "ext-1" },
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
        const stablecoinBridge = {
            getHealth() {
                return health;
            },
            resetHealth() {
                return;
            },
            async hasExternalReference(externalReference) {
                return externalReference === stablecoinRequest.externalReference;
            },
            async submitStablecoinTransfer(input) {
                return {
                    status: "applied",
                    externalReference: input.externalReference ?? "0xtx-1",
                    processedAt: 1_700_000_000_500,
                    idempotencyKey: input.idempotencyKey,
                    connectorMetadata: input.connectorMetadata,
                    transactionHash: input.externalReference ?? "0xtx-1",
                    chainId: input.chainId,
                    network: input.network,
                    blockNumber: 123,
                };
            },
        };
        const tx = {
            txId: "0xtx-1",
            operation: "governance_proposal_create",
            status: "submitted",
            submittedAt: 1_700_000_000_000,
            lastUpdatedAt: 1_700_000_000_000,
            confirmations: 0,
            confirmationDepth: 2,
            finalityDepth: 4,
        };
        const event = {
            kind: "tracked",
            transaction: tx,
            summary: {
                trackedTransactionCount: 1,
                submittedCount: 1,
                confirmedCount: 0,
                finalizedCount: 0,
                reorgedCount: 0,
                confirmationDepth: 2,
                finalityDepth: 4,
            },
        };
        const provider = {
            trackTransaction() {
                return tx;
            },
            recordTransactionInclusion() {
                return tx;
            },
            recordCanonicalBlock() { },
            advanceHead() {
                return event.summary;
            },
            getTransaction() {
                return tx;
            },
            listTransactions() {
                return { items: [tx] };
            },
            getSummary() {
                return event.summary;
            },
        };
        const signer = {
            getAddress() {
                return "0x1111111111111111111111111111111111111111";
            },
            async signTransaction(payload) {
                return JSON.stringify(payload);
            },
        };
        const manifest = {
            id: "manifest-1",
            schemaVersion: "1.0.0",
            proofType: "identity",
            manifestVersion: "1.0.0",
            runtimeVersion: "0.2.0",
            circuit: {
                name: "identity-proof",
                version: "1.0.0",
                provingSystem: "groth16",
            },
            artifacts: [],
            createdAt: 1_700_000_000_000,
            manifestIntegrity: "sha256:manifest",
        };
        const proveRequest = {
            requestId: "request-1",
            traceId: "trace-1",
            proofType: "identity",
            proverId: "prover-1",
            challenge: "challenge",
            publicInputs: { participantId: "worker-1" },
            witness: { secret: true },
            createdAt: 1_700_000_000_000,
            manifest,
        };
        const proveResponse = {
            commitment: "commitment",
            proof: "proof-bytes",
            traceId: proveRequest.traceId,
            adapterReceiptId: "adapter-1",
        };
        const verifyRequest = {
            traceId: proveRequest.traceId,
            proofId: "proof-1",
            proofType: proveRequest.proofType,
            proverId: proveRequest.proverId,
            commitment: proveResponse.commitment,
            proof: proveResponse.proof,
            publicInputs: proveRequest.publicInputs,
            createdAt: proveRequest.createdAt,
            manifest,
        };
        const verifyResponse = {
            verified: true,
            traceId: verifyRequest.traceId,
            adapterReceiptId: "adapter-verify-1",
            details: { manifestVersion: manifest.manifestVersion },
        };
        const stablecoinResult = await stablecoinBridge.submitStablecoinTransfer(stablecoinRequest);
        expect(health.profile?.credentialType).toBe("bearer");
        expect(transportRequest.connector).toBe("llm_token_metering");
        expect(transportResponse.status).toBe(201);
        expect(stablecoinResult.transactionHash).toBe("0xtx-1");
        expect(stablecoinResult.chainId).toBe(1);
        expect(provider.getSummary().trackedTransactionCount).toBe(1);
        expect(await signer.signTransaction({ to: tx.txId, data: "0x1234", nonce: 0 })).toContain("0x1234");
        expect(proveResponse.adapterReceiptId).toBe("adapter-1");
        expect(verifyResponse.details?.manifestVersion).toBe("1.0.0");
    });
});
