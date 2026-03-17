/**
 * Auto Swap utilities per PACT Whitepaper §5.2.
 *
 * Mirrors the PactAutoSwap contract and core AutoSwapService interface.
 * Provides:
 *  - Domain types (SwapRoute, SwapRequest, SwapResult, etc.)
 *  - Quote estimation helpers
 *  - Swap request builders with slippage protection
 *  - In-memory AutoSwapManager for local/test use
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface SwapRoute {
  /** Token address / identifier */
  tokenIn: string;
  /** Pool fee tier in basis points (e.g. 3000 = 0.3%) */
  poolFeeBps: number;
  /** Whether the route is enabled */
  enabled: boolean;
}

export interface SwapRequest {
  /** Token being swapped */
  tokenIn: string;
  /** Amount in smallest unit (wei / satoshi / etc.) */
  amountIn: bigint;
  /** Minimum acceptable output amount (slippage protection) */
  minAmountOut: bigint;
  /** Caller-defined reference for tracking */
  ref: string;
}

export interface SwapResult {
  /** Amount of USDC received */
  amountOut: bigint;
  /** Reference echoed back */
  ref: string;
  /** Timestamp of execution */
  executedAt: number;
  /** Effective exchange rate (amountOut / amountIn) as a float string */
  effectiveRate: string;
}

export interface SwapToEscrowRequest {
  tokenIn: string;
  amountIn: bigint;
  minAmountOut: bigint;
  taskId: string;
}

export interface SwapToEscrowResult extends SwapResult {
  taskId: string;
  escrowCredited: boolean;
}

export interface SwapQuoteRequest {
  tokenIn: string;
  amountIn: bigint;
}

export interface SwapQuote {
  estimatedOut: bigint;
  poolFeeBps: number;
  priceImpactBps: number;
}

// ─── Error ──────────────────────────────────────────────────────────

export type AutoSwapErrorCode =
  | "TOKEN_NOT_SUPPORTED"
  | "INVALID_AMOUNT"
  | "SLIPPAGE_EXCEEDED"
  | "SWAP_FAILED"
  | "ROUTE_DISABLED"
  | "ZERO_ADDRESS";

export class AutoSwapError extends Error {
  constructor(
    message: string,
    public readonly code: AutoSwapErrorCode,
  ) {
    super(message);
    this.name = "AutoSwapError";
  }
}

// ─── Constants ──────────────────────────────────────────────────────

const BPS_DENOMINATOR = 10_000n;
const MAX_SLIPPAGE_BPS = 2000; // 20%
const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

// ─── Pure Helpers ───────────────────────────────────────────────────

/**
 * Build a SwapRequest with automatic slippage protection.
 *
 * Calculates minAmountOut = expectedOut * (1 - slippageBps/10000).
 */
export function buildSwapRequest(params: {
  tokenIn: string;
  amountIn: bigint;
  expectedOut: bigint;
  slippageBps?: number;
  ref: string;
}): SwapRequest {
  const { tokenIn, amountIn, expectedOut, ref } = params;
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

  validateSlippage(slippageBps);

  if (!tokenIn.trim()) {
    throw new AutoSwapError("tokenIn is required", "ZERO_ADDRESS");
  }
  if (amountIn <= 0n) {
    throw new AutoSwapError("amountIn must be positive", "INVALID_AMOUNT");
  }
  if (expectedOut <= 0n) {
    throw new AutoSwapError("expectedOut must be positive", "INVALID_AMOUNT");
  }

  const minAmountOut = applySlippage(expectedOut, slippageBps);

  return { tokenIn, amountIn, minAmountOut, ref };
}

/**
 * Build a SwapToEscrowRequest with automatic slippage protection.
 */
export function buildSwapToEscrowRequest(params: {
  tokenIn: string;
  amountIn: bigint;
  expectedOut: bigint;
  slippageBps?: number;
  taskId: string;
}): SwapToEscrowRequest {
  const { tokenIn, amountIn, expectedOut, taskId } = params;
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

  validateSlippage(slippageBps);

  if (!tokenIn.trim()) {
    throw new AutoSwapError("tokenIn is required", "ZERO_ADDRESS");
  }
  if (amountIn <= 0n) {
    throw new AutoSwapError("amountIn must be positive", "INVALID_AMOUNT");
  }
  if (expectedOut <= 0n) {
    throw new AutoSwapError("expectedOut must be positive", "INVALID_AMOUNT");
  }
  if (!taskId.trim()) {
    throw new AutoSwapError("taskId is required", "INVALID_AMOUNT");
  }

  const minAmountOut = applySlippage(expectedOut, slippageBps);

  return { tokenIn, amountIn, minAmountOut, taskId };
}

/**
 * Apply slippage tolerance: result = amount * (10000 - slippageBps) / 10000
 */
export function applySlippage(amount: bigint, slippageBps: number): bigint {
  validateSlippage(slippageBps);
  if (amount <= 0n) return 0n;
  return (amount * (BPS_DENOMINATOR - BigInt(slippageBps))) / BPS_DENOMINATOR;
}

/**
 * Compute effective exchange rate as a decimal string.
 * Returns "amountOut / amountIn" with up to 18 decimal places.
 */
export function computeEffectiveRate(amountIn: bigint, amountOut: bigint): string {
  if (amountIn <= 0n) return "0";
  const scaled = (amountOut * 1_000_000_000_000_000_000n) / amountIn;
  const intPart = scaled / 1_000_000_000_000_000_000n;
  const fracPart = scaled % 1_000_000_000_000_000_000n;
  const fracStr = fracPart.toString().padStart(18, "0").replace(/0+$/, "") || "0";
  return `${intPart}.${fracStr}`;
}

/**
 * Estimate price impact in basis points using simplified AMM constant-product model.
 * Impact ≈ amountIn / (amountIn + poolLiquidity) * 10000
 */
export function estimatePriceImpactBps(amountIn: bigint, poolLiquidity: bigint): number {
  if (amountIn <= 0n || poolLiquidity <= 0n) return 0;
  const denominator = amountIn + poolLiquidity;
  const impact = Number((amountIn * BPS_DENOMINATOR) / denominator);
  return Math.min(impact, 10_000);
}

/**
 * Apply pool fee deduction: result = amount * (10000 - feeBps) / 10000
 */
export function applyPoolFee(amount: bigint, feeBps: number): bigint {
  if (feeBps < 0 || feeBps > 100_000) {
    throw new AutoSwapError("feeBps out of range", "INVALID_AMOUNT");
  }
  if (amount <= 0n) return 0n;
  return (amount * (BPS_DENOMINATOR - BigInt(feeBps))) / BPS_DENOMINATOR;
}

// ─── AutoSwapManager (in-memory, mirrors core) ─────────────────────

export interface ExchangeRate {
  rateNumerator: bigint;
  rateDenominator: bigint;
}

export interface AutoSwapManagerOptions {
  defaultSlippageBps?: number;
  rates?: Map<string, ExchangeRate>;
  onEscrowCredit?: (taskId: string, amountUsdc: bigint) => Promise<void>;
}

/**
 * In-memory AutoSwapManager for SDK-side simulation and testing.
 * Mirrors the core InMemoryAutoSwapService interface.
 */
export class AutoSwapManager {
  private _defaultSlippageBps: number;
  private readonly routes = new Map<string, SwapRoute>();
  private readonly rates: Map<string, ExchangeRate>;
  private readonly onEscrowCredit?: (taskId: string, amountUsdc: bigint) => Promise<void>;
  private readonly history: SwapResult[] = [];

  constructor(options: AutoSwapManagerOptions = {}) {
    this._defaultSlippageBps = options.defaultSlippageBps ?? DEFAULT_SLIPPAGE_BPS;
    this.rates = options.rates ?? new Map();
    this.onEscrowCredit = options.onEscrowCredit;
  }

  // ─── Core Operations ───────────────────────────────────────────

  async swap(request: SwapRequest): Promise<SwapResult> {
    this.validateInput(request.tokenIn, request.amountIn);
    const route = this.requireEnabledRoute(request.tokenIn);
    const quote = this.computeQuote(request.tokenIn, request.amountIn, route.poolFeeBps);

    if (quote.estimatedOut < request.minAmountOut) {
      throw new AutoSwapError(
        `Slippage exceeded: estimated ${quote.estimatedOut}, minimum ${request.minAmountOut}`,
        "SLIPPAGE_EXCEEDED",
      );
    }

    const amountOut = applyPoolFee(quote.estimatedOut, route.poolFeeBps);

    if (amountOut < request.minAmountOut) {
      throw new AutoSwapError(
        `Swap output ${amountOut} below minimum ${request.minAmountOut} after fees`,
        "SLIPPAGE_EXCEEDED",
      );
    }

    const result: SwapResult = {
      amountOut,
      ref: request.ref,
      executedAt: Date.now(),
      effectiveRate: computeEffectiveRate(request.amountIn, amountOut),
    };

    this.history.push(result);
    return result;
  }

  async swapToEscrow(request: SwapToEscrowRequest): Promise<SwapToEscrowResult> {
    if (!request.taskId.trim()) {
      throw new AutoSwapError("taskId is required", "INVALID_AMOUNT");
    }

    const swapResult = await this.swap({
      tokenIn: request.tokenIn,
      amountIn: request.amountIn,
      minAmountOut: request.minAmountOut,
      ref: `escrow:${request.taskId}`,
    });

    let escrowCredited = false;
    if (this.onEscrowCredit) {
      await this.onEscrowCredit(request.taskId, swapResult.amountOut);
      escrowCredited = true;
    }

    return { ...swapResult, taskId: request.taskId, escrowCredited };
  }

  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    this.validateInput(request.tokenIn, request.amountIn);
    const route = this.requireEnabledRoute(request.tokenIn);
    return this.computeQuote(request.tokenIn, request.amountIn, route.poolFeeBps);
  }

  // ─── Route Management ─────────────────────────────────────────

  getRoute(tokenIn: string): SwapRoute | undefined {
    return this.routes.get(tokenIn.toLowerCase());
  }

  isTokenSupported(tokenIn: string): boolean {
    const route = this.routes.get(tokenIn.toLowerCase());
    return route !== undefined && route.enabled;
  }

  configureRoute(tokenIn: string, poolFeeBps: number, enabled: boolean): void {
    if (!tokenIn.trim()) {
      throw new AutoSwapError("tokenIn is required", "ZERO_ADDRESS");
    }
    if (poolFeeBps < 0 || poolFeeBps > 100_000) {
      throw new AutoSwapError("poolFeeBps out of range", "INVALID_AMOUNT");
    }
    const key = tokenIn.toLowerCase();
    this.routes.set(key, { tokenIn: key, poolFeeBps, enabled });
  }

  setDefaultSlippageBps(bps: number): void {
    validateSlippage(bps);
    this._defaultSlippageBps = bps;
  }

  getDefaultSlippageBps(): number {
    return this._defaultSlippageBps;
  }

  listSupportedTokens(): string[] {
    return [...this.routes.entries()]
      .filter(([, route]) => route.enabled)
      .map(([key]) => key);
  }

  /** Set a mock exchange rate (for testing) */
  setRate(tokenIn: string, rateNumerator: bigint, rateDenominator: bigint): void {
    if (rateDenominator <= 0n) {
      throw new AutoSwapError("rateDenominator must be positive", "INVALID_AMOUNT");
    }
    this.rates.set(tokenIn.toLowerCase(), { rateNumerator, rateDenominator });
  }

  /** Get swap execution history */
  getHistory(): readonly SwapResult[] {
    return this.history;
  }

  // ─── Internal ─────────────────────────────────────────────────

  private validateInput(tokenIn: string, amountIn: bigint): void {
    if (!tokenIn.trim()) {
      throw new AutoSwapError("tokenIn is required", "ZERO_ADDRESS");
    }
    if (amountIn <= 0n) {
      throw new AutoSwapError("amountIn must be positive", "INVALID_AMOUNT");
    }
  }

  private requireEnabledRoute(tokenIn: string): SwapRoute {
    const key = tokenIn.toLowerCase();
    const route = this.routes.get(key);
    if (!route) {
      throw new AutoSwapError(`Token ${tokenIn} is not supported`, "TOKEN_NOT_SUPPORTED");
    }
    if (!route.enabled) {
      throw new AutoSwapError(`Route for ${tokenIn} is disabled`, "ROUTE_DISABLED");
    }
    return route;
  }

  private computeQuote(tokenIn: string, amountIn: bigint, poolFeeBps: number): SwapQuote {
    const key = tokenIn.toLowerCase();
    const rate = this.rates.get(key);

    let estimatedOut: bigint;
    if (rate) {
      estimatedOut = (amountIn * rate.rateNumerator) / rate.rateDenominator;
    } else {
      estimatedOut = amountIn; // default 1:1
    }

    const impactDenom = amountIn + 1_000_000n;
    const priceImpactBps = Number((amountIn * BPS_DENOMINATOR) / impactDenom);

    return {
      estimatedOut,
      poolFeeBps,
      priceImpactBps: Math.min(priceImpactBps, 10_000),
    };
  }
}

// ─── Validation ─────────────────────────────────────────────────────

function validateSlippage(bps: number): void {
  if (!Number.isFinite(bps) || bps < 0 || bps > MAX_SLIPPAGE_BPS) {
    throw new AutoSwapError(
      `Slippage must be 0-${MAX_SLIPPAGE_BPS} bps, got ${bps}`,
      "INVALID_AMOUNT",
    );
  }
}
