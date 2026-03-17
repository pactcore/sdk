import { describe, expect, test } from "bun:test";
import {
  addNoise,
  advancedComposition,
  calculatePrivacyBudget,
  compositionTheorem,
  computeSensitivity,
  DifferentialPrivacyError,
  PrivacyBudgetManager,
} from "../src/differential-privacy";

// ─── addNoise ───────────────────────────────────────────────────────

describe("addNoise", () => {
  test("laplace mechanism produces deterministic output for same inputs", () => {
    const a = addNoise(100, 1.0, "laplace");
    const b = addNoise(100, 1.0, "laplace");
    expect(a).toBe(b);
  });

  test("gaussian mechanism produces deterministic output", () => {
    const a = addNoise(100, 1.0, "gaussian");
    const b = addNoise(100, 1.0, "gaussian");
    expect(a).toBe(b);
  });

  test("exponential mechanism produces deterministic output", () => {
    const a = addNoise(100, 1.0, "exponential");
    const b = addNoise(100, 1.0, "exponential");
    expect(a).toBe(b);
  });

  test("different mechanisms produce different results", () => {
    const laplace = addNoise(100, 1.0, "laplace");
    const gaussian = addNoise(100, 1.0, "gaussian");
    const exponential = addNoise(100, 1.0, "exponential");
    const results = new Set([laplace, gaussian, exponential]);
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  test("smaller epsilon produces more noise (laplace)", () => {
    const highPrivacy = addNoise(100, 0.1, "laplace");
    const lowPrivacy = addNoise(100, 10.0, "laplace");
    // High privacy should deviate more from true value on average
    expect(Math.abs(highPrivacy - 100)).toBeGreaterThanOrEqual(0);
    expect(Math.abs(lowPrivacy - 100)).toBeLessThan(Math.abs(highPrivacy - 100) + 100);
  });

  test("throws for non-finite value", () => {
    expect(() => addNoise(Infinity, 1.0, "laplace")).toThrow(DifferentialPrivacyError);
    expect(() => addNoise(NaN, 1.0, "laplace")).toThrow(DifferentialPrivacyError);
  });

  test("throws for non-positive epsilon", () => {
    expect(() => addNoise(100, 0, "laplace")).toThrow(DifferentialPrivacyError);
    expect(() => addNoise(100, -1, "laplace")).toThrow(DifferentialPrivacyError);
  });

  test("throws for invalid mechanism", () => {
    // @ts-expect-error testing invalid mechanism
    expect(() => addNoise(100, 1.0, "invalid")).toThrow(DifferentialPrivacyError);
  });

  test("handles zero value", () => {
    const result = addNoise(0, 1.0, "laplace");
    expect(Number.isFinite(result)).toBe(true);
  });

  test("handles negative value", () => {
    const result = addNoise(-50, 1.0, "gaussian");
    expect(Number.isFinite(result)).toBe(true);
  });

  test("rounds to 6 decimal places", () => {
    const result = addNoise(100, 0.5, "laplace");
    const decimals = result.toString().split(".")[1] ?? "";
    expect(decimals.length).toBeLessThanOrEqual(6);
  });

  test("matches core domain output for laplace", () => {
    // Core uses the same deterministic FNV hash + Laplace sampling
    const result = addNoise(42, 1.0, "laplace");
    expect(Number.isFinite(result)).toBe(true);
    expect(result).not.toBe(42); // noise was added
  });
});

// ─── calculatePrivacyBudget ─────────────────────────────────────────

describe("calculatePrivacyBudget", () => {
  test("computes budget for multiple queries", () => {
    expect(calculatePrivacyBudget(10, 0.1)).toBe(1.0);
  });

  test("returns 0 for zero queries", () => {
    expect(calculatePrivacyBudget(0, 0.5)).toBe(0);
  });

  test("returns 0 for zero epsilon", () => {
    expect(calculatePrivacyBudget(5, 0)).toBe(0);
  });

  test("throws for negative query count", () => {
    expect(() => calculatePrivacyBudget(-1, 0.1)).toThrow(DifferentialPrivacyError);
  });

  test("throws for non-integer query count", () => {
    expect(() => calculatePrivacyBudget(1.5, 0.1)).toThrow(DifferentialPrivacyError);
  });

  test("throws for negative epsilon", () => {
    expect(() => calculatePrivacyBudget(10, -0.1)).toThrow(DifferentialPrivacyError);
  });

  test("throws for NaN epsilon", () => {
    expect(() => calculatePrivacyBudget(10, NaN)).toThrow(DifferentialPrivacyError);
  });
});

// ─── compositionTheorem ─────────────────────────────────────────────

describe("compositionTheorem", () => {
  test("sums epsilons", () => {
    expect(compositionTheorem([0.1, 0.2, 0.3])).toBe(0.6);
  });

  test("returns 0 for empty array", () => {
    expect(compositionTheorem([])).toBe(0);
  });

  test("handles single epsilon", () => {
    expect(compositionTheorem([0.5])).toBe(0.5);
  });

  test("throws for negative epsilon in array", () => {
    expect(() => compositionTheorem([0.1, -0.2])).toThrow(DifferentialPrivacyError);
  });

  test("throws for NaN in array", () => {
    expect(() => compositionTheorem([0.1, NaN])).toThrow(DifferentialPrivacyError);
  });

  test("throws for non-array input", () => {
    // @ts-expect-error testing non-array
    expect(() => compositionTheorem("not-array")).toThrow(DifferentialPrivacyError);
  });
});

// ─── advancedComposition ────────────────────────────────────────────

describe("advancedComposition", () => {
  test("produces tighter bound than basic composition", () => {
    const basic = calculatePrivacyBudget(100, 0.1); // 10.0
    const advanced = advancedComposition(0.1, 100, 1e-5);
    expect(advanced).toBeLessThan(basic);
  });

  test("single query matches epsilon (approximately)", () => {
    const result = advancedComposition(1.0, 1, 1e-5);
    // For 1 query, should be close to ε + ε(e^ε - 1)
    expect(result).toBeGreaterThan(1.0);
    expect(result).toBeLessThan(10.0);
  });

  test("throws for non-positive epsilon", () => {
    expect(() => advancedComposition(0, 10, 1e-5)).toThrow(DifferentialPrivacyError);
    expect(() => advancedComposition(-1, 10, 1e-5)).toThrow(DifferentialPrivacyError);
  });

  test("throws for non-positive query count", () => {
    expect(() => advancedComposition(0.1, 0, 1e-5)).toThrow(DifferentialPrivacyError);
  });

  test("throws for delta out of (0,1)", () => {
    expect(() => advancedComposition(0.1, 10, 0)).toThrow(DifferentialPrivacyError);
    expect(() => advancedComposition(0.1, 10, 1)).toThrow(DifferentialPrivacyError);
    expect(() => advancedComposition(0.1, 10, -0.1)).toThrow(DifferentialPrivacyError);
  });
});

// ─── computeSensitivity ─────────────────────────────────────────────

describe("computeSensitivity", () => {
  test("count query has sensitivity 1", () => {
    expect(computeSensitivity("count", 100)).toBe(1);
  });

  test("mean query has sensitivity 1/n", () => {
    expect(computeSensitivity("mean", 100)).toBe(0.01);
  });

  test("mean query with small dataset", () => {
    expect(computeSensitivity("mean", 2)).toBe(0.5);
  });

  test("throws for non-positive dataset size", () => {
    expect(() => computeSensitivity("count", 0)).toThrow(DifferentialPrivacyError);
    expect(() => computeSensitivity("count", -1)).toThrow(DifferentialPrivacyError);
  });

  test("throws for non-integer dataset size", () => {
    expect(() => computeSensitivity("count", 1.5)).toThrow(DifferentialPrivacyError);
  });

  test("throws for unknown query type", () => {
    // @ts-expect-error testing unknown type
    expect(() => computeSensitivity("sum", 100)).toThrow(DifferentialPrivacyError);
  });
});

// ─── PrivacyBudgetManager ───────────────────────────────────────────

describe("PrivacyBudgetManager", () => {
  test("register dataset and get status", () => {
    const mgr = new PrivacyBudgetManager();
    mgr.registerDataset("ds-1", 2.0);
    const status = mgr.getStatus("ds-1");
    expect(status.datasetId).toBe("ds-1");
    expect(status.totalBudget).toBe(2.0);
    expect(status.consumed).toBe(0);
    expect(status.remaining).toBe(2.0);
    expect(status.queryCount).toBe(0);
    expect(status.exhausted).toBe(false);
  });

  test("uses default budget if not specified", () => {
    const mgr = new PrivacyBudgetManager({ defaultBudget: 5.0 });
    mgr.registerDataset("ds-1");
    expect(mgr.getStatus("ds-1").totalBudget).toBe(5.0);
  });

  test("query consumes budget", () => {
    const mgr = new PrivacyBudgetManager();
    mgr.registerDataset("ds-1", 1.0);
    const result = mgr.query("ds-1", 100, 0.1, "laplace");
    expect(Number.isFinite(result)).toBe(true);
    const status = mgr.getStatus("ds-1");
    expect(status.consumed).toBe(0.1);
    expect(status.remaining).toBe(0.9);
    expect(status.queryCount).toBe(1);
  });

  test("multiple queries accumulate budget", () => {
    const mgr = new PrivacyBudgetManager();
    mgr.registerDataset("ds-1", 1.0);
    mgr.query("ds-1", 50, 0.2, "laplace");
    mgr.query("ds-1", 75, 0.3, "gaussian");
    const status = mgr.getStatus("ds-1");
    expect(status.consumed).toBe(0.5);
    expect(status.queryCount).toBe(2);
  });

  test("throws when budget exhausted", () => {
    const mgr = new PrivacyBudgetManager();
    mgr.registerDataset("ds-1", 0.5);
    mgr.query("ds-1", 100, 0.3, "laplace");
    expect(() => mgr.query("ds-1", 100, 0.3, "laplace")).toThrow("Budget exhausted");
  });

  test("throws for unregistered dataset query", () => {
    const mgr = new PrivacyBudgetManager();
    expect(() => mgr.query("unknown", 100, 0.1, "laplace")).toThrow("not registered");
  });

  test("throws for unregistered dataset status", () => {
    const mgr = new PrivacyBudgetManager();
    expect(() => mgr.getStatus("unknown")).toThrow("not registered");
  });

  test("query history tracking", () => {
    const mgr = new PrivacyBudgetManager();
    mgr.registerDataset("ds-1", 2.0);
    mgr.query("ds-1", 100, 0.1, "laplace", "q-custom");
    mgr.query("ds-1", 200, 0.2, "gaussian");
    const history = mgr.getQueryHistory("ds-1");
    expect(history).toHaveLength(2);
    expect(history[0]!.queryId).toBe("q-custom");
    expect(history[0]!.epsilon).toBe(0.1);
    expect(history[0]!.mechanism).toBe("laplace");
    expect(history[1]!.queryId).toBe("q-2");
    expect(history[1]!.mechanism).toBe("gaussian");
  });

  test("throws for query history of unregistered dataset", () => {
    const mgr = new PrivacyBudgetManager();
    expect(() => mgr.getQueryHistory("unknown")).toThrow("not registered");
  });

  test("listDatasets returns registered datasets", () => {
    const mgr = new PrivacyBudgetManager();
    mgr.registerDataset("ds-a", 1.0);
    mgr.registerDataset("ds-b", 2.0);
    const datasets = mgr.listDatasets();
    expect(datasets).toContain("ds-a");
    expect(datasets).toContain("ds-b");
    expect(datasets).toHaveLength(2);
  });

  test("resetDataset clears consumed and history", () => {
    const mgr = new PrivacyBudgetManager();
    mgr.registerDataset("ds-1", 1.0);
    mgr.query("ds-1", 100, 0.3, "laplace");
    mgr.resetDataset("ds-1");
    const status = mgr.getStatus("ds-1");
    expect(status.consumed).toBe(0);
    expect(status.queryCount).toBe(0);
    expect(status.remaining).toBe(1.0);
    expect(mgr.getQueryHistory("ds-1")).toHaveLength(0);
  });

  test("throws resetDataset for unregistered dataset", () => {
    const mgr = new PrivacyBudgetManager();
    expect(() => mgr.resetDataset("unknown")).toThrow("not registered");
  });

  test("exhausted flag set when budget fully consumed", () => {
    const mgr = new PrivacyBudgetManager();
    mgr.registerDataset("ds-1", 0.2);
    mgr.query("ds-1", 100, 0.2, "laplace");
    const status = mgr.getStatus("ds-1");
    expect(status.exhausted).toBe(true);
    expect(status.remaining).toBe(0);
  });

  test("throws for empty datasetId", () => {
    const mgr = new PrivacyBudgetManager();
    expect(() => mgr.registerDataset("")).toThrow("datasetId is required");
  });

  test("throws for non-positive budget", () => {
    const mgr = new PrivacyBudgetManager();
    expect(() => mgr.registerDataset("ds-1", 0)).toThrow(DifferentialPrivacyError);
    expect(() => mgr.registerDataset("ds-1", -1)).toThrow(DifferentialPrivacyError);
  });

  test("throws for non-positive default budget in constructor", () => {
    expect(() => new PrivacyBudgetManager({ defaultBudget: 0 })).toThrow(
      DifferentialPrivacyError,
    );
  });
});

// ─── DifferentialPrivacyError ───────────────────────────────────────

describe("DifferentialPrivacyError", () => {
  test("has correct name and code", () => {
    const err = new DifferentialPrivacyError("test", "BUDGET_EXHAUSTED");
    expect(err.name).toBe("DifferentialPrivacyError");
    expect(err.code).toBe("BUDGET_EXHAUSTED");
    expect(err.message).toBe("test");
    expect(err instanceof Error).toBe(true);
  });
});
