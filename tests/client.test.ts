import { describe, expect, it } from "bun:test";
import { PactSdk } from "../src/client";

describe("PactSdk", () => {
  it("calls health endpoint", async () => {
    const sdk = new PactSdk({
      baseUrl: "https://example.pact",
      fetchImpl: async (input) => {
        expect(String(input)).toBe("https://example.pact/health");
        return new Response(JSON.stringify({ ok: true, service: "pact-core" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const res = await sdk.health();
    expect(res.ok).toBeTrue();
  });

  it("throws on non-2xx response", async () => {
    const sdk = new PactSdk({
      baseUrl: "https://example.pact",
      fetchImpl: async () => new Response("boom", { status: 500 }),
    });

    expect(async () => sdk.listTasks()).toThrow(/PACT SDK request failed/);
  });
});
