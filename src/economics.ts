export type CompensationAssetKind =
  | "usdc"
  | "stablecoin"
  | "llm_token"
  | "cloud_credit"
  | "api_quota"
  | "custom";

export interface CompensationAssetDescriptor {
  id: string;
  kind: CompensationAssetKind;
  symbol?: string;
}

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

export interface AssetValuationRate {
  assetId: string;
  referenceAssetId: string;
  rate: number;
}

export interface ReferenceAssetQuote {
  referenceAssetId: string;
  totalsByAsset: Record<string, number>;
  convertedByAsset: Record<string, number>;
  totalInReference: number;
  missingAssetIds: string[];
}

export interface SettlementLine {
  assetId: string;
  amount: number;
  rail: "onchain_stablecoin" | "llm_metering" | "cloud_billing" | "api_quota" | "custom";
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

export function quoteCompensationInReference(
  model: CompensationModel,
  referenceAssetId: string,
  rates: AssetValuationRate[],
): ReferenceAssetQuote {
  const totalsByAsset = summarizeCompensationByAsset(model);
  const rateMap = new Map(rates.map((rate) => [`${rate.assetId}->${rate.referenceAssetId}`, rate.rate]));

  const convertedByAsset: Record<string, number> = {};
  const missingAssetIds: string[] = [];
  let totalInReference = 0;

  for (const [assetId, amount] of Object.entries(totalsByAsset)) {
    if (assetId === referenceAssetId) {
      convertedByAsset[assetId] = amount;
      totalInReference += amount;
      continue;
    }

    const rate = rateMap.get(`${assetId}->${referenceAssetId}`);
    if (rate === undefined) {
      missingAssetIds.push(assetId);
      continue;
    }

    const converted = amount * rate;
    convertedByAsset[assetId] = converted;
    totalInReference += converted;
  }

  return {
    referenceAssetId,
    totalsByAsset,
    convertedByAsset,
    totalInReference,
    missingAssetIds,
  };
}

export function buildSettlementPlan(
  model: CompensationModel,
  assets: CompensationAssetDescriptor[],
): SettlementLine[] {
  const totalsByAsset = summarizeCompensationByAsset(model);
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  return Object.entries(totalsByAsset)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([assetId, amount]) => {
      const asset = assetMap.get(assetId);
      if (!asset) {
        throw new Error(`unknown asset descriptor: ${assetId}`);
      }

      return {
        assetId,
        amount,
        rail: settlementRailForKind(asset.kind),
      };
    });
}

function settlementRailForKind(kind: CompensationAssetKind): SettlementLine["rail"] {
  switch (kind) {
    case "usdc":
    case "stablecoin":
      return "onchain_stablecoin";
    case "llm_token":
      return "llm_metering";
    case "cloud_credit":
      return "cloud_billing";
    case "api_quota":
      return "api_quota";
    default:
      return "custom";
  }
}
