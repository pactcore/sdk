import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client.ts";

const sdk = new PactSdk({ baseUrl: "https://pact.test", apiKey: "test" });
const rr = (/** @type {string} */ method, /** @type {string} */ path, /** @type {any} */ body) => ({
  method,
  path,
  body,
});

const origRequest = sdk.request.bind(sdk);
sdk.request = async function (method, path, body) {
  return rr(method, path, body);
};

describe("PactSdk - Batch 37 - Core committee validation", () => {
  it("stakeValidator -> POST /committee/validators", async () => {
    const input = { validatorId: "v1", stakeCents: 1000 };
    const res = await sdk.stakeValidator(input);
    expect(res).toEqual(rr("POST", "/committee/validators", input));
  });

  it("listValidatorAccounts -> GET /committee/validators", async () => {
    const res = await sdk.listValidatorAccounts();
    expect(res).toEqual(rr("GET", "/committee/validators", undefined));
  });

  it("getValidatorAccount -> GET /committee/validators/:id", async () => {
    const res = await sdk.getValidatorAccount("v1");
    expect(res).toEqual(rr("GET", "/committee/validators/v1", undefined));
  });

  it("configureCommittee -> POST /committee/configure", async () => {
    const input = { missionId: "m1", committeeSize: 3 };
    const res = await sdk.configureCommittee(input);
    expect(res).toEqual(rr("POST", "/committee/configure", input));
  });

  it("castCoreCommitteeVote -> POST /committee/vote", async () => {
    const input = { missionId: "m1", validatorId: "v1", decision: "approve", reasoning: "good" };
    const res = await sdk.castCoreCommitteeVote(input);
    expect(res).toEqual(rr("POST", "/committee/vote", input));
  });

  it("getCoreCommitteeReview -> GET /committee/:missionId", async () => {
    const res = await sdk.getCoreCommitteeReview("m1");
    expect(res).toEqual(rr("GET", "/committee/m1", undefined));
  });

  it("finalizeCoreCommittee -> POST /committee/:missionId/finalize", async () => {
    const res = await sdk.finalizeCoreCommittee("m1");
    expect(res).toEqual(rr("POST", "/committee/m1/finalize", undefined));
  });

  it("recordCoreCommitteeAppeal -> POST /committee/:missionId/appeal", async () => {
    const res = await sdk.recordCoreCommitteeAppeal("m1");
    expect(res).toEqual(rr("POST", "/committee/m1/appeal", undefined));
  });
});
