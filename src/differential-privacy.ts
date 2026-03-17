/**
 * Differential Privacy utilities per PACT Whitepaper §8.5 / §12.
 *
 * Mirrors the core domain differential-privacy module.
 * Provides:
 *  - Noise injection (Laplace, Gaussian, Exponential mechanisms)
 *  - Privacy budget accounting
 *  - Sequential composition theorem
 *  - In-memory PrivacyBudgetManager for SDK-side tracking
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Supported differential privacy noise mechanisms */
export type DPMechanism = "laplace" | "gaussian" | "exponential";

/** A single privacy query record */
export interface PrivacyQueryRecord {
  /** Unique query identifier */
  queryId: string;
  /** Epsilon consumed by this query */
  epsilon: number;
  /** Mechanism used */
  mechanism: DPMechanism;
  /** Timestamp of the query */
  timestamp: number;
}

/** Budget status for a dataset */
export interface PrivacyBudgetStatus {
  /** Dataset identifier */
  datasetId: string;
  /** Total epsilon budget */
  totalBudget: number;
  /** Epsilon consumed so far */
  consumed: number;
  /** Remaining epsilon */
  remaining: number;
  /** Number of queries executed */
  queryCount: number;
  /** Whether the budget is exhausted */
  exhausted: boolean;
}

// ─── Error ──────────────────────────────────────────────────────────

export type DPErrorCode =
  | "INVALID_EPSILON"
  | "INVALID_VALUE"
  | "BUDGET_EXHAUSTED"
  | "INVALID_MECHANISM"
  | "INVALID_QUERY_COUNT"
  | "DATASET_NOT_FOUND";

export class DifferentialPrivacyError extends Error {
  constructor(
    message: string,
    public readonly code: DPErrorCode,
  ) {
    super(message);
    this.name = "DifferentialPrivacyError";
  }
}

// ─── Constants ──────────────────────────────────────────────────────

const EPSILON_FLOOR = 1e-9;
const UINT32_MAX_PLUS_ONE = 4_294_967_296;

// ─── Core Functions (mirrors core domain) ───────────────────────────

/**
 * Add calibrated noise to a value using the specified DP mechanism.
 *
 * @param value - The true value to protect
 * @param epsilon - Privacy parameter (smaller = more privacy, more noise)
 * @param mechanism - Noise distribution to use
 * @returns The noised value
 */
export function addNoise(value: number, epsilon: number, mechanism: DPMechanism): number {
  if (!Number.isFinite(value)) {
    throw new DifferentialPrivacyError("value must be a finite number", "INVALID_VALUE");
  }
  if (!Number.isFinite(epsilon) || epsilon <= 0) {
    throw new DifferentialPrivacyError("epsilon must be a positive number", "INVALID_EPSILON");
  }

  const safeEpsilon = Math.max(epsilon, EPSILON_FLOOR);
  const seed = `${mechanism}|${value}`;
  const unitA = clampOpenUnitInterval(deterministicUnit(seed));
  const unitB = clampOpenUnitInterval(deterministicUnit(`${seed}|b`));

  let noise = 0;

  switch (mechanism) {
    case "laplace": {
      const scale = 1 / safeEpsilon;
      noise = sampleLaplace(scale, unitA);
      break;
    }
    case "gaussian": {
      const sigma = Math.SQRT2 / safeEpsilon;
      noise = sampleGaussian(sigma, unitA, unitB);
      break;
    }
    case "exponential": {
      const scale = 1 / safeEpsilon;
      noise = sampleSymmetricExponential(scale, unitA, unitB);
      break;
    }
    default: {
      throw new DifferentialPrivacyError(
        `Unsupported mechanism: ${String(mechanism)}`,
        "INVALID_MECHANISM",
      );
    }
  }

  return roundTo(value + noise, 6);
}

/**
 * Calculate total privacy budget consumed by sequential queries.
 *
 * Uses basic sequential composition: total ε = Σ εᵢ
 */
export function calculatePrivacyBudget(queryCount: number, epsilonPerQuery: number): number {
  if (!Number.isInteger(queryCount) || queryCount < 0) {
    throw new DifferentialPrivacyError(
      "queryCount must be a non-negative integer",
      "INVALID_QUERY_COUNT",
    );
  }
  if (!Number.isFinite(epsilonPerQuery) || epsilonPerQuery < 0) {
    throw new DifferentialPrivacyError(
      "epsilonPerQuery must be a non-negative number",
      "INVALID_EPSILON",
    );
  }

  return roundTo(queryCount * epsilonPerQuery, 6);
}

/**
 * Apply the sequential composition theorem: total ε = Σ εᵢ
 *
 * @param epsilons - Array of per-query epsilon values
 * @returns Total privacy loss
 */
export function compositionTheorem(epsilons: number[]): number {
  if (!Array.isArray(epsilons)) {
    throw new DifferentialPrivacyError("epsilons must be an array", "INVALID_EPSILON");
  }

  let total = 0;
  for (const [index, epsilon] of epsilons.entries()) {
    if (!Number.isFinite(epsilon) || epsilon < 0) {
      throw new DifferentialPrivacyError(
        `epsilons[${index}] must be a non-negative number`,
        "INVALID_EPSILON",
      );
    }
    total += epsilon;
  }

  return roundTo(total, 6);
}

/**
 * Apply the advanced composition theorem for tighter bounds.
 *
 * For k queries each with epsilon ε, the composed bound is:
 *   ε_total = ε * √(2k * ln(1/δ)) + k * ε * (e^ε - 1)
 *
 * @param epsilonPerQuery - Per-query epsilon
 * @param queryCount - Number of queries
 * @param delta - Failure probability (typically very small, e.g. 1e-5)
 * @returns Tighter total privacy loss bound
 */
export function advancedComposition(
  epsilonPerQuery: number,
  queryCount: number,
  delta: number,
): number {
  if (!Number.isFinite(epsilonPerQuery) || epsilonPerQuery <= 0) {
    throw new DifferentialPrivacyError(
      "epsilonPerQuery must be a positive number",
      "INVALID_EPSILON",
    );
  }
  if (!Number.isInteger(queryCount) || queryCount < 1) {
    throw new DifferentialPrivacyError(
      "queryCount must be a positive integer",
      "INVALID_QUERY_COUNT",
    );
  }
  if (!Number.isFinite(delta) || delta <= 0 || delta >= 1) {
    throw new DifferentialPrivacyError("delta must be in (0, 1)", "INVALID_EPSILON");
  }

  const sqrtTerm = epsilonPerQuery * Math.sqrt(2 * queryCount * Math.log(1 / delta));
  const linearTerm = queryCount * epsilonPerQuery * (Math.exp(epsilonPerQuery) - 1);

  return roundTo(sqrtTerm + linearTerm, 6);
}

/**
 * Compute the sensitivity of a counting query over a dataset of given size.
 * Sensitivity = 1/n for a mean query, 1 for a count query.
 *
 * @param queryType - "count" or "mean"
 * @param datasetSize - Number of records
 * @returns Global sensitivity
 */
export function computeSensitivity(queryType: "count" | "mean", datasetSize: number): number {
  if (!Number.isInteger(datasetSize) || datasetSize < 1) {
    throw new DifferentialPrivacyError(
      "datasetSize must be a positive integer",
      "INVALID_VALUE",
    );
  }

  switch (queryType) {
    case "count":
      return 1;
    case "mean":
      return roundTo(1 / datasetSize, 6);
    default:
      throw new DifferentialPrivacyError(
        `Unknown query type: ${String(queryType)}`,
        "INVALID_VALUE",
      );
  }
}

// ─── PrivacyBudgetManager (in-memory, for SDK-side tracking) ────────

export interface PrivacyBudgetManagerOptions {
  /** Default total epsilon budget for new datasets */
  defaultBudget?: number;
}

/**
 * In-memory privacy budget manager for SDK-side DP accounting.
 *
 * Tracks per-dataset epsilon consumption, enforces budget limits,
 * and records query history for auditability.
 */
export class PrivacyBudgetManager {
  private readonly defaultBudget: number;
  private readonly budgets = new Map<string, number>();
  private readonly consumed = new Map<string, number>();
  private readonly queries = new Map<string, PrivacyQueryRecord[]>();

  constructor(options: PrivacyBudgetManagerOptions = {}) {
    this.defaultBudget = options.defaultBudget ?? 1.0;
    if (!Number.isFinite(this.defaultBudget) || this.defaultBudget <= 0) {
      throw new DifferentialPrivacyError(
        "defaultBudget must be a positive number",
        "INVALID_EPSILON",
      );
    }
  }

  /**
   * Register a dataset with an optional custom budget.
   */
  registerDataset(datasetId: string, budget?: number): void {
    const b = budget ?? this.defaultBudget;
    if (!Number.isFinite(b) || b <= 0) {
      throw new DifferentialPrivacyError("budget must be a positive number", "INVALID_EPSILON");
    }
    if (!datasetId.trim()) {
      throw new DifferentialPrivacyError("datasetId is required", "DATASET_NOT_FOUND");
    }
    this.budgets.set(datasetId, b);
    if (!this.consumed.has(datasetId)) {
      this.consumed.set(datasetId, 0);
    }
    if (!this.queries.has(datasetId)) {
      this.queries.set(datasetId, []);
    }
  }

  /**
   * Execute a privacy-preserving query against a dataset.
   * Consumes epsilon from the dataset's budget.
   *
   * @returns The noised value
   * @throws DifferentialPrivacyError if budget exhausted
   */
  query(
    datasetId: string,
    value: number,
    epsilon: number,
    mechanism: DPMechanism,
    queryId?: string,
  ): number {
    const budget = this.budgets.get(datasetId);
    if (budget === undefined) {
      throw new DifferentialPrivacyError(
        `Dataset ${datasetId} not registered`,
        "DATASET_NOT_FOUND",
      );
    }

    const currentConsumed = this.consumed.get(datasetId) ?? 0;
    if (currentConsumed + epsilon > budget) {
      throw new DifferentialPrivacyError(
        `Budget exhausted for dataset ${datasetId}: consumed ${currentConsumed}, requesting ${epsilon}, budget ${budget}`,
        "BUDGET_EXHAUSTED",
      );
    }

    const noisedValue = addNoise(value, epsilon, mechanism);

    this.consumed.set(datasetId, roundTo(currentConsumed + epsilon, 6));

    const records = this.queries.get(datasetId) ?? [];
    records.push({
      queryId: queryId ?? `q-${records.length + 1}`,
      epsilon,
      mechanism,
      timestamp: Date.now(),
    });
    this.queries.set(datasetId, records);

    return noisedValue;
  }

  /**
   * Get the budget status for a dataset.
   */
  getStatus(datasetId: string): PrivacyBudgetStatus {
    const budget = this.budgets.get(datasetId);
    if (budget === undefined) {
      throw new DifferentialPrivacyError(
        `Dataset ${datasetId} not registered`,
        "DATASET_NOT_FOUND",
      );
    }

    const consumed = this.consumed.get(datasetId) ?? 0;
    const remaining = roundTo(budget - consumed, 6);
    const queryCount = (this.queries.get(datasetId) ?? []).length;

    return {
      datasetId,
      totalBudget: budget,
      consumed,
      remaining,
      queryCount,
      exhausted: remaining <= 0,
    };
  }

  /**
   * Get query history for a dataset.
   */
  getQueryHistory(datasetId: string): readonly PrivacyQueryRecord[] {
    const records = this.queries.get(datasetId);
    if (records === undefined) {
      throw new DifferentialPrivacyError(
        `Dataset ${datasetId} not registered`,
        "DATASET_NOT_FOUND",
      );
    }
    return records;
  }

  /**
   * List all registered dataset IDs.
   */
  listDatasets(): string[] {
    return [...this.budgets.keys()];
  }

  /**
   * Reset a dataset's consumed budget and query history.
   */
  resetDataset(datasetId: string): void {
    if (!this.budgets.has(datasetId)) {
      throw new DifferentialPrivacyError(
        `Dataset ${datasetId} not registered`,
        "DATASET_NOT_FOUND",
      );
    }
    this.consumed.set(datasetId, 0);
    this.queries.set(datasetId, []);
  }
}

// ─── Internal Helpers ───────────────────────────────────────────────

function sampleLaplace(scale: number, unit: number): number {
  const centered = unit - 0.5;
  const sign = centered < 0 ? -1 : 1;
  const magnitude = -scale * Math.log(1 - 2 * Math.abs(centered));
  return sign * magnitude;
}

function sampleGaussian(sigma: number, unitA: number, unitB: number): number {
  const radial = Math.sqrt(-2 * Math.log(unitA));
  const angle = 2 * Math.PI * unitB;
  return sigma * radial * Math.cos(angle);
}

function sampleSymmetricExponential(scale: number, unitA: number, unitB: number): number {
  const magnitude = -Math.log(1 - unitA) * scale * 0.5;
  const sign = unitB >= 0.5 ? 1 : -1;
  return sign * magnitude;
}

function deterministicUnit(seed: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return ((hash >>> 0) + 0.5) / UINT32_MAX_PLUS_ONE;
}

function clampOpenUnitInterval(value: number): number {
  if (value <= EPSILON_FLOOR) {
    return EPSILON_FLOOR;
  }
  if (value >= 1 - EPSILON_FLOOR) {
    return 1 - EPSILON_FLOOR;
  }
  return value;
}

function roundTo(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}
