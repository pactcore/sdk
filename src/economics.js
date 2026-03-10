export function buildCompensationModel(input) {
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
export function summarizeCompensationByAsset(model) {
    const totals = {};
    for (const leg of model.legs) {
        totals[leg.assetId] = (totals[leg.assetId] ?? 0) + leg.amount;
    }
    return totals;
}
export function quoteCompensationInReference(model, referenceAssetId, rates) {
    const totalsByAsset = summarizeCompensationByAsset(model);
    const rateMap = new Map(rates.map((rate) => [`${rate.assetId}->${rate.referenceAssetId}`, rate.rate]));
    const convertedByAsset = {};
    const missingAssetIds = [];
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
export function buildSettlementPlan(model, assets) {
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
export function buildSettlementExecutionRequest(model, input) {
    if (!model.legs.length) {
        throw new Error("Settlement execution requires at least one compensation leg");
    }
    const idempotencyKey = input.idempotencyKey.trim();
    if (idempotencyKey.length === 0) {
        throw new Error("Settlement execution requires an idempotency key");
    }
    return {
        model,
        settlementId: input.settlementId,
        idempotencyKey,
    };
}
export function buildSettlementAuditQueryParams(filter = {}, page = {}) {
    const query = new URLSearchParams();
    if (filter.settlementId) {
        query.set("settlementId", filter.settlementId);
    }
    if (filter.assetId) {
        query.set("assetId", filter.assetId);
    }
    if (filter.rail) {
        query.set("rail", filter.rail);
    }
    if (filter.payerId) {
        query.set("payerId", filter.payerId);
    }
    if (filter.payeeId) {
        query.set("payeeId", filter.payeeId);
    }
    if (filter.status) {
        query.set("status", filter.status);
    }
    if (filter.reconciledBy) {
        query.set("reconciledBy", filter.reconciledBy);
    }
    if (page.cursor) {
        query.set("cursor", page.cursor);
    }
    if (page.limit !== undefined) {
        query.set("limit", String(page.limit));
    }
    const suffix = query.toString();
    return suffix.length > 0 ? `?${suffix}` : "";
}
export function buildSettlementReplayQueryParams(input = {}) {
    const query = new URLSearchParams();
    if (input.fromOffset !== undefined) {
        query.set("fromOffset", String(input.fromOffset));
    }
    if (input.limit !== undefined) {
        query.set("limit", String(input.limit));
    }
    const suffix = query.toString();
    return suffix.length > 0 ? `?${suffix}` : "";
}
export function buildReconciliationQueueQueryParams(input = {}) {
    const query = new URLSearchParams();
    if (input.state) {
        query.set("state", input.state);
    }
    if (input.connector) {
        query.set("connector", input.connector);
    }
    if (input.settlementId) {
        query.set("settlementId", input.settlementId);
    }
    if (input.idempotencyKey) {
        query.set("idempotencyKey", input.idempotencyKey);
    }
    if (input.cursor) {
        query.set("cursor", input.cursor);
    }
    if (input.limit !== undefined) {
        query.set("limit", String(input.limit));
    }
    const suffix = query.toString();
    return suffix.length > 0 ? `?${suffix}` : "";
}
function settlementRailForKind(kind) {
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
