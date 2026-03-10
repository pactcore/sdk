import { describe, expect, it } from "bun:test";
import type {
  ManagedBackendInventory,
  ManagedBackendObservabilityAdapter,
  ManagedBackendQueueAdapter,
  ManagedBackendStoreAdapter,
  OnchainFinalityProvider,
  OnchainFinalitySummary,
  OnchainTransactionRecord,
  TransactionSigner,
  UnsignedSerializedTransaction,
  ZKArtifactManifest,
  ZKBridgeRuntimeInfo,
  ZKProof,
} from "../src/types";
import type {
  SettlementConnectorRequest,
  StablecoinBridgeSettlementRequest,
  SettlementConnectors,
  SettlementConnectorTransport,
  SettlementConnectorTransportRequest,
} from "../src/economics";

describe("Type parity contracts", () => {
  it("models managed backend adapter inventory contracts", async () => {
    const queue: ManagedBackendQueueAdapter<{ jobId: string }> = {
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

    const store: ManagedBackendStoreAdapter<{ value: string }> = {
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

    const observability: ManagedBackendObservabilityAdapter = {
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

    const inventory: ManagedBackendInventory = {
      compute: { queue },
      data: { store },
      dev: { observability },
    };

    const receipt = await inventory.compute?.queue?.enqueue({
      id: "msg-1",
      topic: "jobs.run",
      payload: { jobId: "job-1" },
      createdAt: 1700000000000,
    });

    expect(receipt?.state).toBe("queued");
    expect((await inventory.data?.store?.get("artifact-1"))?.etag).toBe("etag-1");
  });

  it("models Appendix C manifest and bridge runtime fields", () => {
    const manifest: ZKArtifactManifest = {
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

    const runtime: ZKBridgeRuntimeInfo = {
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

    const proof: ZKProof = {
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

  it("models settlement connector transport and contract surfaces", async () => {
    const transport: SettlementConnectorTransport = {
      async send(request: SettlementConnectorTransportRequest) {
        return {
          status: 200,
          body: { connector: request.connector, acknowledged: true },
          headers: { "x-connector": request.connector },
        };
      },
    };

    const request: SettlementConnectorRequest = {
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
    const stablecoinRequest: StablecoinBridgeSettlementRequest = {
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

    const connectors: SettlementConnectors = {
      stablecoinBridge: {
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
    const stablecoinResult = await connectors.stablecoinBridge.submitStablecoinTransfer(
      stablecoinRequest,
    );

    expect(response.status).toBe(200);
    expect(result.status).toBe("applied");
    expect(result.externalReference).toBe("metering:record-1");
    expect(result.metadata?.ledger).toBe("primary");
    expect(result.idempotencyKey).toBe("idem-1");
    expect(stablecoinResult.status).toBe("applied");
    expect(stablecoinResult.transactionHash).toBe("0xtx-1");
    expect(stablecoinResult.chainId).toBe(1);
    expect(await connectors.llmTokenMetering.hasExternalReference("ext-1")).toBe(true);
    expect(await connectors.stablecoinBridge.hasExternalReference("0xtx-1")).toBe(true);
  });

  it("models onchain finality provider and signer contracts", async () => {
    const tracked: OnchainTransactionRecord = {
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

    const summary: OnchainFinalitySummary = {
      trackedTransactionCount: 1,
      submittedCount: 0,
      confirmedCount: 1,
      finalizedCount: 0,
      reorgedCount: 0,
      headBlockNumber: 111,
      confirmationDepth: 12,
      finalityDepth: 32,
    };

    const provider: OnchainFinalityProvider = {
      trackTransaction(input) {
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
      recordTransactionInclusion(input) {
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
      recordCanonicalBlock() {
        return;
      },
      advanceHead() {
        return summary;
      },
      getTransaction() {
        return tracked;
      },
      listTransactions() {
        return { items: [tracked] };
      },
      getSummary() {
        return summary;
      },
    };

    const signer: TransactionSigner = {
      getAddress() {
        return "0xsigner";
      },
      async signTransaction(payload: UnsignedSerializedTransaction) {
        return `${payload.to}:${payload.nonce}`;
      },
    };

    const inclusion = provider.recordTransactionInclusion({
      txId: "0xtx-1",
      blockNumber: 111,
      blockHash: "0xblock",
    });
    const signature = await signer.signTransaction({
      to: "0xcore",
      data: "0xdeadbeef",
      nonce: 7,
    });

    expect(inclusion.status).toBe("confirmed");
    expect(provider.getSummary().headBlockNumber).toBe(111);
    expect(signature).toBe("0xcore:7");
  });
});
