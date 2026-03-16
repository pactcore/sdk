import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PactSdk } from "../src/client";

const clientSource = readFileSync(join(import.meta.dir, "../src/client.ts"), "utf8");

function publicAsyncMethods(): string[] {
  return Object.getOwnPropertyNames(PactSdk.prototype)
    .filter((name) => name !== "constructor" && name !== "request")
    .sort();
}

describe("PactSdk route parity audit guardrails", () => {
  it("keeps the audited public surface stable", () => {
    const methods = publicAsyncMethods();

    expect(methods).toHaveLength(185);
    expect(methods).toContain("querySettlementReconciliationRecords");
    expect(methods).toContain("getAntiSpamStake");
    expect(methods).toContain("trackOnchainTransaction");
    expect(methods).toContain("recordOnchainTransactionInclusion");
    expect(methods).toContain("recordCanonicalBlock");
  });

  it("keeps the audited parity exceptions explicit in source", () => {
    expect((clientSource.match(/this\.request(?:<[^>]+>)?\(/g) ?? []).length).toBe(184);

    expect(clientSource).toContain("/anti-spam/${encodeURIComponent(participantId)}/stake/${encodeURIComponent(action)}");
    expect(clientSource).toContain('"POST", "/onchain/finality/transactions", input');
    expect(clientSource).toContain("/onchain/finality/transactions/${encodeURIComponent(txId)}/inclusion");
    expect(clientSource).toContain('"POST", "/onchain/finality/blocks/canonical", input');
  });

  it("keeps settlement reconciliation as a composed helper", () => {
    expect(clientSource).toContain("async querySettlementReconciliationRecords(");
    expect(clientSource).toContain("return this.querySettlementAuditRecords(");
    expect(clientSource).toContain('status: filter?.status ?? "reconciled"');
  });
});
