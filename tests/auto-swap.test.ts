import { describe, expect, test } from "bun:test";
import {
  applyPoolFee,
  applySlippage,
  AutoSwapError,
  AutoSwapManager,
  buildSwapRequest,
  buildSwapToEscrowRequest,
  computeEffectiveRate,
  estimatePriceImpactBps,
} from "../src/auto-swap";

// ─── Pure Helpers ───────────────────────────────────────────────────

describe("applySlippage", () => {
  test("applies 50 bps (0.5%) slippage", () => {
    // 10000 * (10000 - 50) / 10000 = 9950
    expect(applySlippage(10000n, 50)).toBe(9950n);
  });

  test("applies 100 bps (1%) slippage", () => {
    expect(applySlippage(10000n, 100)).toBe(9900n);
  });

  test("applies 0 bps slippage (no adjustment)", () => {
    expect(applySlippage(10000n, 0)).toBe(10000n);
  });

  test("returns 0 for zero amount", () => {
    expect(applySlippage(0n, 50)).toBe(0n);
  });

  test("throws for negative slippage", () => {
    expect(() => applySlippage(10000n, -1)).toThrow(AutoSwapError);
  });

  test("throws for slippage > 2000 bps", () => {
    expect(() => applySlippage(10000n, 2001)).toThrow(AutoSwapError);
  });

  test("allows max slippage (2000 bps = 20%)", () => {
    expect(applySlippage(10000n, 2000)).toBe(8000n);
  });
});

describe("computeEffectiveRate", () => {
  test("1:1 rate", () => {
    expect(computeEffectiveRate(1000n, 1000n)).toBe("1.0");
  });

  test("2:1 rate", () => {
    expect(computeEffectiveRate(1000n, 2000n)).toBe("2.0");
  });

  test("returns 0 for zero amountIn", () => {
    expect(computeEffectiveRate(0n, 1000n)).toBe("0");
  });

  test("fractional rate", () => {
    const rate = computeEffectiveRate(3n, 1n);
    expect(rate).toMatch(/^0\.3/);
  });
});

describe("estimatePriceImpactBps", () => {
  test("small trade vs large pool has low impact", () => {
    const impact = estimatePriceImpactBps(100n, 1_000_000n);
    expect(impact).toBeLessThan(10);
  });

  test("large trade vs small pool has high impact", () => {
    const impact = estimatePriceImpactBps(1_000_000n, 100n);
    expect(impact).toBeGreaterThan(9000);
  });

  test("returns 0 for zero amountIn", () => {
    expect(estimatePriceImpactBps(0n, 1000n)).toBe(0);
  });

  test("returns 0 for zero pool liquidity", () => {
    expect(estimatePriceImpactBps(1000n, 0n)).toBe(0);
  });

  test("caps at 10000 bps", () => {
    const impact = estimatePriceImpactBps(10_000_000_000n, 1n);
    expect(impact).toBeLessThanOrEqual(10_000);
  });
});

describe("applyPoolFee", () => {
  test("applies 3000 bps (30%) fee", () => {
    expect(applyPoolFee(10000n, 3000)).toBe(7000n);
  });

  test("applies 0 fee", () => {
    expect(applyPoolFee(10000n, 0)).toBe(10000n);
  });

  test("returns 0 for zero amount", () => {
    expect(applyPoolFee(0n, 3000)).toBe(0n);
  });

  test("throws for negative fee", () => {
    expect(() => applyPoolFee(10000n, -1)).toThrow(AutoSwapError);
  });

  test("throws for fee > 100000", () => {
    expect(() => applyPoolFee(10000n, 100_001)).toThrow(AutoSwapError);
  });
});

// ─── Request Builders ───────────────────────────────────────────────

describe("buildSwapRequest", () => {
  test("builds request with default 50 bps slippage", () => {
    const req = buildSwapRequest({
      tokenIn: "WETH",
      amountIn: 1_000_000n,
      expectedOut: 2_000_000n,
      ref: "test-1",
    });
    expect(req.tokenIn).toBe("WETH");
    expect(req.amountIn).toBe(1_000_000n);
    // 2_000_000 * (10000-50)/10000 = 1_990_000
    expect(req.minAmountOut).toBe(1_990_000n);
    expect(req.ref).toBe("test-1");
  });

  test("builds request with custom slippage", () => {
    const req = buildSwapRequest({
      tokenIn: "WETH",
      amountIn: 1_000_000n,
      expectedOut: 2_000_000n,
      slippageBps: 100,
      ref: "test-2",
    });
    // 2_000_000 * (10000-100)/10000 = 1_980_000
    expect(req.minAmountOut).toBe(1_980_000n);
  });

  test("throws for empty tokenIn", () => {
    expect(() =>
      buildSwapRequest({ tokenIn: "", amountIn: 1000n, expectedOut: 1000n, ref: "x" }),
    ).toThrow("tokenIn is required");
  });

  test("throws for zero amountIn", () => {
    expect(() =>
      buildSwapRequest({ tokenIn: "WETH", amountIn: 0n, expectedOut: 1000n, ref: "x" }),
    ).toThrow("amountIn must be positive");
  });

  test("throws for zero expectedOut", () => {
    expect(() =>
      buildSwapRequest({ tokenIn: "WETH", amountIn: 1000n, expectedOut: 0n, ref: "x" }),
    ).toThrow("expectedOut must be positive");
  });

  test("throws for excessive slippage", () => {
    expect(() =>
      buildSwapRequest({
        tokenIn: "WETH",
        amountIn: 1000n,
        expectedOut: 1000n,
        slippageBps: 3000,
        ref: "x",
      }),
    ).toThrow(AutoSwapError);
  });
});

describe("buildSwapToEscrowRequest", () => {
  test("builds escrow request with slippage", () => {
    const req = buildSwapToEscrowRequest({
      tokenIn: "WBTC",
      amountIn: 500_000n,
      expectedOut: 10_000_000n,
      taskId: "task-abc",
    });
    expect(req.tokenIn).toBe("WBTC");
    expect(req.amountIn).toBe(500_000n);
    expect(req.taskId).toBe("task-abc");
    // 10_000_000 * 9950/10000 = 9_950_000
    expect(req.minAmountOut).toBe(9_950_000n);
  });

  test("throws for empty taskId", () => {
    expect(() =>
      buildSwapToEscrowRequest({
        tokenIn: "WETH",
        amountIn: 1000n,
        expectedOut: 1000n,
        taskId: "",
      }),
    ).toThrow("taskId is required");
  });

  test("throws for whitespace-only taskId", () => {
    expect(() =>
      buildSwapToEscrowRequest({
        tokenIn: "WETH",
        amountIn: 1000n,
        expectedOut: 1000n,
        taskId: "   ",
      }),
    ).toThrow("taskId is required");
  });
});

// ─── AutoSwapManager ────────────────────────────────────────────────

describe("AutoSwapManager", () => {
  function createManager() {
    const mgr = new AutoSwapManager({
      rates: new Map([
        ["weth", { rateNumerator: 2000n, rateDenominator: 1n }],
        ["wbtc", { rateNumerator: 40000n, rateDenominator: 1n }],
      ]),
    });
    mgr.configureRoute("weth", 300, true); // 3% fee
    mgr.configureRoute("wbtc", 100, true); // 1% fee
    return mgr;
  }

  describe("route management", () => {
    test("configure and retrieve route", () => {
      const mgr = createManager();
      const route = mgr.getRoute("WETH");
      expect(route).toBeDefined();
      expect(route!.poolFeeBps).toBe(300);
      expect(route!.enabled).toBe(true);
    });

    test("case insensitive token lookup", () => {
      const mgr = createManager();
      expect(mgr.getRoute("WETH")).toEqual(mgr.getRoute("weth"));
    });

    test("isTokenSupported for enabled token", () => {
      const mgr = createManager();
      expect(mgr.isTokenSupported("weth")).toBe(true);
    });

    test("isTokenSupported for unknown token", () => {
      const mgr = createManager();
      expect(mgr.isTokenSupported("unknown")).toBe(false);
    });

    test("isTokenSupported for disabled route", () => {
      const mgr = createManager();
      mgr.configureRoute("dai", 50, false);
      expect(mgr.isTokenSupported("dai")).toBe(false);
    });

    test("listSupportedTokens returns only enabled", () => {
      const mgr = createManager();
      mgr.configureRoute("dai", 50, false);
      const tokens = mgr.listSupportedTokens();
      expect(tokens).toContain("weth");
      expect(tokens).toContain("wbtc");
      expect(tokens).not.toContain("dai");
    });

    test("throws for empty tokenIn", () => {
      const mgr = new AutoSwapManager();
      expect(() => mgr.configureRoute("", 100, true)).toThrow("tokenIn is required");
    });

    test("throws for poolFeeBps out of range", () => {
      const mgr = new AutoSwapManager();
      expect(() => mgr.configureRoute("weth", -1, true)).toThrow("poolFeeBps out of range");
      expect(() => mgr.configureRoute("weth", 100_001, true)).toThrow("poolFeeBps out of range");
    });
  });

  describe("slippage", () => {
    test("default slippage is 50 bps", () => {
      const mgr = new AutoSwapManager();
      expect(mgr.getDefaultSlippageBps()).toBe(50);
    });

    test("custom default slippage", () => {
      const mgr = new AutoSwapManager({ defaultSlippageBps: 100 });
      expect(mgr.getDefaultSlippageBps()).toBe(100);
    });

    test("setDefaultSlippageBps updates value", () => {
      const mgr = new AutoSwapManager();
      mgr.setDefaultSlippageBps(200);
      expect(mgr.getDefaultSlippageBps()).toBe(200);
    });

    test("throws for slippage > 2000 bps", () => {
      const mgr = new AutoSwapManager();
      expect(() => mgr.setDefaultSlippageBps(2001)).toThrow(AutoSwapError);
    });

    test("throws for negative slippage", () => {
      const mgr = new AutoSwapManager();
      expect(() => mgr.setDefaultSlippageBps(-1)).toThrow(AutoSwapError);
    });
  });

  describe("getQuote", () => {
    test("returns quote with configured rate", async () => {
      const mgr = createManager();
      const quote = await mgr.getQuote({ tokenIn: "weth", amountIn: 1000n });
      // rate = 2000:1, so 1000 * 2000 = 2_000_000
      expect(quote.estimatedOut).toBe(2_000_000n);
      expect(quote.poolFeeBps).toBe(300);
      expect(quote.priceImpactBps).toBeGreaterThanOrEqual(0);
    });

    test("returns 1:1 quote when no rate configured", async () => {
      const mgr = new AutoSwapManager();
      mgr.configureRoute("usdt", 10, true);
      const quote = await mgr.getQuote({ tokenIn: "usdt", amountIn: 5000n });
      expect(quote.estimatedOut).toBe(5000n);
    });

    test("throws for unsupported token", async () => {
      const mgr = createManager();
      await expect(mgr.getQuote({ tokenIn: "unknown", amountIn: 1000n })).rejects.toThrow(
        "not supported",
      );
    });

    test("throws for zero amountIn", async () => {
      const mgr = createManager();
      await expect(mgr.getQuote({ tokenIn: "weth", amountIn: 0n })).rejects.toThrow(
        "amountIn must be positive",
      );
    });
  });

  describe("swap", () => {
    test("executes swap with pool fee deduction", async () => {
      const mgr = createManager();
      const result = await mgr.swap({
        tokenIn: "weth",
        amountIn: 1000n,
        minAmountOut: 1n,
        ref: "swap-1",
      });
      // rate 2000:1 → estimated 2_000_000, fee 300bps → 2_000_000 * 9700/10000 = 1_940_000
      expect(result.amountOut).toBe(1_940_000n);
      expect(result.ref).toBe("swap-1");
      expect(result.executedAt).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeTruthy();
    });

    test("throws SLIPPAGE_EXCEEDED when output below minimum", async () => {
      const mgr = createManager();
      await expect(
        mgr.swap({
          tokenIn: "weth",
          amountIn: 1000n,
          minAmountOut: 999_999_999n,
          ref: "x",
        }),
      ).rejects.toThrow("Slippage exceeded");
    });

    test("throws for disabled route", async () => {
      const mgr = createManager();
      mgr.configureRoute("dai", 50, false);
      await expect(
        mgr.swap({ tokenIn: "dai", amountIn: 1000n, minAmountOut: 1n, ref: "x" }),
      ).rejects.toThrow("is disabled");
    });

    test("records swap in history", async () => {
      const mgr = createManager();
      expect(mgr.getHistory()).toHaveLength(0);
      await mgr.swap({ tokenIn: "weth", amountIn: 1000n, minAmountOut: 1n, ref: "h1" });
      expect(mgr.getHistory()).toHaveLength(1);
      expect(mgr.getHistory()[0]!.ref).toBe("h1");
    });
  });

  describe("swapToEscrow", () => {
    test("swaps and credits escrow", async () => {
      let creditedTask = "";
      let creditedAmount = 0n;

      const mgr = new AutoSwapManager({
        rates: new Map([["weth", { rateNumerator: 1000n, rateDenominator: 1n }]]),
        onEscrowCredit: async (taskId, amount) => {
          creditedTask = taskId;
          creditedAmount = amount;
        },
      });
      mgr.configureRoute("weth", 100, true);

      const result = await mgr.swapToEscrow({
        tokenIn: "weth",
        amountIn: 500n,
        minAmountOut: 1n,
        taskId: "task-42",
      });

      expect(result.taskId).toBe("task-42");
      expect(result.escrowCredited).toBe(true);
      expect(creditedTask).toBe("task-42");
      expect(creditedAmount).toBe(result.amountOut);
    });

    test("escrowCredited false when no callback", async () => {
      const mgr = createManager();
      const result = await mgr.swapToEscrow({
        tokenIn: "weth",
        amountIn: 1000n,
        minAmountOut: 1n,
        taskId: "task-99",
      });
      expect(result.escrowCredited).toBe(false);
    });

    test("throws for empty taskId", async () => {
      const mgr = createManager();
      await expect(
        mgr.swapToEscrow({
          tokenIn: "weth",
          amountIn: 1000n,
          minAmountOut: 1n,
          taskId: "",
        }),
      ).rejects.toThrow("taskId is required");
    });
  });

  describe("setRate", () => {
    test("updates exchange rate", async () => {
      const mgr = createManager();
      mgr.setRate("weth", 5000n, 1n);
      const quote = await mgr.getQuote({ tokenIn: "weth", amountIn: 100n });
      expect(quote.estimatedOut).toBe(500_000n);
    });

    test("throws for zero denominator", () => {
      const mgr = new AutoSwapManager();
      expect(() => mgr.setRate("weth", 1000n, 0n)).toThrow("rateDenominator must be positive");
    });

    test("throws for negative denominator", () => {
      const mgr = new AutoSwapManager();
      expect(() => mgr.setRate("weth", 1000n, -1n)).toThrow("rateDenominator must be positive");
    });
  });
});

// ─── AutoSwapError ──────────────────────────────────────────────────

describe("AutoSwapError", () => {
  test("has correct name and code", () => {
    const err = new AutoSwapError("test", "SWAP_FAILED");
    expect(err.name).toBe("AutoSwapError");
    expect(err.code).toBe("SWAP_FAILED");
    expect(err.message).toBe("test");
    expect(err instanceof Error).toBe(true);
  });
});
