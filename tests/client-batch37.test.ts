import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client";
import type { FetchLike } from "../src/client";

interface CapturedRequest {
  method: string;
  url: string;
  body: unknown;
}

function createMockSdk(responseBody: unknown = {}): {
  sdk: PactSdk;
  captured: CapturedRequest[];
} {
  const captured: CapturedRequest[] = [];
  const fetchImpl: FetchLike = async (input, init) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    captured.push({
      method: (init?.method as string) ?? "GET",
      url: String(input),
      body,
    });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const sdk = new PactSdk({ baseUrl: "https://api.pact", fetchImpl });
  return { sdk, captured };
}

describe("PactSdk - Batch 37 - Core committee validation", () => {
  it("stakeValidator -> POST /committee/validators", async () => {
    const { sdk, captured } = createMockSdk({
      validatorId: "v1",
      stakeCents: 1000,
      available: true,
    });
    const result = await sdk.stakeValidator({ validatorId: "v1", stakeCents: 1000 });
    expect(result.validatorId).toBe("v1");
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/committee/validators");
    expect(captured[0].body).toEqual({ validatorId: "v1", stakeCents: 1000 });
  });

  it("listValidatorAccounts -> GET /committee/validators", async () => {
    const { sdk, captured } = createMockSdk([]);
    await sdk.listValidatorAccounts();
    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/committee/validators");
  });

  it("getValidatorAccount -> GET /committee/validators/:id", async () => {
    const { sdk, captured } = createMockSdk({ validatorId: "v1" });
    const result = await sdk.getValidatorAccount("v1");
    expect(result.validatorId).toBe("v1");
    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/committee/validators/v1");
  });

  it("configureCommittee -> POST /committee/configure", async () => {
    const { sdk, captured } = createMockSdk({ id: "committee_1", missionId: "m1", status: "pending" });
    const result = await sdk.configureCommittee({ missionId: "m1", committeeSize: 3 });
    expect(result.id).toBe("committee_1");
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/committee/configure");
    expect(captured[0].body).toEqual({ missionId: "m1", committeeSize: 3 });
  });

  it("castCoreCommitteeVote -> POST /committee/vote", async () => {
    const { sdk, captured } = createMockSdk({ id: "committee_1", status: "pending" });
    await sdk.castCoreCommitteeVote({
      missionId: "m1",
      validatorId: "v1",
      decision: "approve",
      reasoning: "good work",
    });
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/committee/vote");
    expect(captured[0].body).toEqual({
      missionId: "m1",
      validatorId: "v1",
      decision: "approve",
      reasoning: "good work",
    });
  });

  it("getCoreCommitteeReview -> GET /committee/:missionId", async () => {
    const { sdk, captured } = createMockSdk({ id: "committee_1", missionId: "m1" });
    const result = await sdk.getCoreCommitteeReview("m1");
    expect(result.missionId).toBe("m1");
    expect(captured[0].method).toBe("GET");
    expect(captured[0].url).toBe("https://api.pact/committee/m1");
  });

  it("finalizeCoreCommittee -> POST /committee/:missionId/finalize", async () => {
    const { sdk, captured } = createMockSdk({ id: "committee_1", status: "approved" });
    const result = await sdk.finalizeCoreCommittee("m1");
    expect(result.status).toBe("approved");
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/committee/m1/finalize");
  });

  it("recordCoreCommitteeAppeal -> POST /committee/:missionId/appeal", async () => {
    const { sdk, captured } = createMockSdk({ recorded: true });
    const result = await sdk.recordCoreCommitteeAppeal("m1");
    expect(result.recorded).toBe(true);
    expect(captured[0].method).toBe("POST");
    expect(captured[0].url).toBe("https://api.pact/committee/m1/appeal");
  });
});
