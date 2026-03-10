import { describe, expect, it } from "bun:test";
import type {
  ExternalZKProveRequest,
  ExternalZKProveResponse,
  ExternalZKVerifyRequest,
  ExternalZKVerifyResponse,
  ManagedBackendInventory,
  ManagedBackendQueueAdapter,
  ManagedBackendStoreAdapter,
  ManagedTraceRecord,
  OnchainFinalityProvider,
  OnchainIndexerHookEvent,
  OnchainTransactionRecord,
  TransactionSigner,
  UnsignedSerializedTransaction,
} from "../src/types";
import type {
  SettlementConnectorHealth,
  SettlementConnectorProviderProfile,
  SettlementConnectorTransportRequest,
  SettlementConnectorTransportResponse,
} from "../src/economics";

describe("SDK type parity - batch 36 bridge contracts", () => {
  it("supports managed backend adapter contract shapes", async () => {
    const queue: ManagedBackendQueueAdapter<{ taskId: string }> = {
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
    const store: ManagedBackendStoreAdapter<{ status: string }> = {
      domain: "compute",
      capability: "store",
      mode: "local",
      async put() {},
      async get(key) {
        return {
          key,
          value: { status: "ok" },
          updatedAt: 1_700_000_000_000,
        };
      },
    };
    const trace: ManagedTraceRecord = {
      traceId: "trace-1",
      spanId: "span-1",
      name: "compute.exec",
      startedAt: 1_700_000_000_000,
      status: "ok",
      attributes: { queuedMessages: 1 },
    };
    const inventory: ManagedBackendInventory = {
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
    const profile: SettlementConnectorProviderProfile = {
      id: "openai-live",
      providerId: "openai",
      endpoint: "https://billing.example.test/llm",
      credentialSchema: {
        type: "bearer",
        fields: [{ key: "token", required: true, secret: true }],
      },
      credentials: { token: "secret" },
    };
    const health: SettlementConnectorHealth = {
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
    const transportRequest: SettlementConnectorTransportRequest = {
      connector: "llm_token_metering",
      operation: "apply_metering_credit",
      method: "POST",
      url: profile.endpoint!,
      headers: { authorization: "Bearer secret" },
      body: JSON.stringify({ settlementId: "settlement-1" }),
      timeoutMs: health.timeoutMs,
    };
    const transportResponse: SettlementConnectorTransportResponse = {
      status: 201,
      body: { externalReference: "ext-1" },
    };
    const tx: OnchainTransactionRecord = {
      txId: "0xtx-1",
      operation: "governance_proposal_create",
      status: "submitted",
      submittedAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_000,
      confirmations: 0,
      confirmationDepth: 2,
      finalityDepth: 4,
    };
    const event: OnchainIndexerHookEvent = {
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
    const provider: OnchainFinalityProvider = {
      trackTransaction() {
        return tx;
      },
      recordTransactionInclusion() {
        return tx;
      },
      recordCanonicalBlock() {},
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
    const signer: TransactionSigner = {
      getAddress() {
        return "0x1111111111111111111111111111111111111111";
      },
      async signTransaction(payload: UnsignedSerializedTransaction) {
        return JSON.stringify(payload);
      },
    };
    const manifest = {
      id: "manifest-1",
      schemaVersion: "1.0.0",
      proofType: "identity" as const,
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
    const proveRequest: ExternalZKProveRequest = {
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
    const proveResponse: ExternalZKProveResponse = {
      commitment: "commitment",
      proof: "proof-bytes",
      traceId: proveRequest.traceId,
      adapterReceiptId: "adapter-1",
    };
    const verifyRequest: ExternalZKVerifyRequest = {
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
    const verifyResponse: ExternalZKVerifyResponse = {
      verified: true,
      traceId: verifyRequest.traceId,
      adapterReceiptId: "adapter-verify-1",
      details: { manifestVersion: manifest.manifestVersion },
    };

    expect(health.profile?.credentialType).toBe("bearer");
    expect(transportRequest.connector).toBe("llm_token_metering");
    expect(transportResponse.status).toBe(201);
    expect(provider.getSummary().trackedTransactionCount).toBe(1);
    expect(await signer.signTransaction({ to: tx.txId, data: "0x1234", nonce: 0 })).toContain("0x1234");
    expect(proveResponse.adapterReceiptId).toBe("adapter-1");
    expect(verifyResponse.details?.manifestVersion).toBe("1.0.0");
  });
});
