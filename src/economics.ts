export type CompensationAssetKind =
  | "usdc"
  | "stablecoin"
  | "llm_token"
  | "cloud_credit"
  | "api_quota"
  | "custom";

export interface CompensationLegInput {
  payerId: string;
  payeeId: string;
  assetId: string;
  amount: number;
  unit: string;
  description?: string;
}

export interface CompensationModelInput {
  mode?: "single_asset" | "multi_asset";
  settlementWindowSec?: number;
  legs: CompensationLegInput[];
  metadata?: Record<string, string>;
}

export interface CompensationModel {
  mode: "single_asset" | "multi_asset";
  settlementWindowSec?: number;
  legs: Array<CompensationLegInput & { id: string }>;
  metadata?: Record<string, string>;
}

export function buildCompensationModel(input: CompensationModelInput): CompensationModel {
  const mode = input.mode ?? "multi_asset";
  const legs = input.legs.map((leg, index) => ({
    ...leg,
    id: `leg-${index + 1}`,
  }));

  if (legs.length === 0) {
    throw new Error("Compensation model requires at least one leg");
  }

  if (mode === "single_asset") {
    const distinctAssets = new Set(legs.map((leg) => leg.assetId));
    if (distinctAssets.size > 1) {
      throw new Error("single_asset mode cannot include multiple assets");
    }
  }

  for (const leg of legs) {
    if (!Number.isFinite(leg.amount) || leg.amount <= 0) {
      throw new Error(`invalid compensation amount in ${leg.id}`);
    }
    if (!leg.payerId || !leg.payeeId) {
      throw new Error(`payer/payee required in ${leg.id}`);
    }
  }

  return {
    mode,
    settlementWindowSec: input.settlementWindowSec,
    legs,
    metadata: input.metadata,
  };
}

export function summarizeCompensationByAsset(model: CompensationModel): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const leg of model.legs) {
    totals[leg.assetId] = (totals[leg.assetId] ?? 0) + leg.amount;
  }
  return totals;
}
