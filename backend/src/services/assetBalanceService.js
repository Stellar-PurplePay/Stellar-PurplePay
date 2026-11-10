"use strict";

const BASE_RESERVE_XLM = 0.5; // Current Stellar protocol base reserve per subentry

class AssetBalanceError extends Error {
  constructor(message, code = "ASSET_BALANCE_ERROR") {
    super(message);
    this.name = "AssetBalanceError";
    this.code = code;
  }
}

/**
 * Returns canonical asset identifier string.
 * @param {Asset|object|string} asset
 * @returns {string} e.g. "native", "USDC:GA5Z...", or "liquidity_pool:<id>"
 */
function getAssetIdentifier(asset) {
  if (!asset) return "native";
  if (typeof asset === "string") {
    return asset === "XLM" || asset === "native" ? "native" : asset;
  }
  if (asset.isNative && asset.isNative()) {
    return "native";
  }
  if (asset.getCode && asset.getIssuer) {
    return `${asset.getCode()}:${asset.getIssuer()}`;
  }
  if (asset.asset_type === "native") {
    return "native";
  }
  if (asset.asset_code && asset.asset_issuer) {
    return `${asset.asset_code}:${asset.asset_issuer}`;
  }
  if (asset.liquidity_pool_id) {
    return `liquidity_pool:${asset.liquidity_pool_id}`;
  }
  return String(asset);
}

/**
 * Parses all balances from a Horizon account object and computes spendable amount.
 *
 * @param {object} account - Horizon account response
 * @param {number} [baseReserve=0.5]
 * @returns {Array<object>}
 */
function parseAccountBalances(account, baseReserve = BASE_RESERVE_XLM) {
  if (!account || !Array.isArray(account.balances)) {
    throw new AssetBalanceError("Invalid account response: missing balances array", "INVALID_ACCOUNT");
  }

  const subentryCount = account.subentry_count ?? 0;
  // Account minimum reserve = (2 + subentryCount) * baseReserve
  const minimumReserveXlm = (2 + subentryCount) * baseReserve;

  return account.balances.map((b) => {
    const rawBalance = parseFloat(b.balance || "0");
    const sellingLiabilities = parseFloat(b.selling_liabilities || "0");
    const buyingLiabilities = parseFloat(b.buying_liabilities || "0");
    const limit = b.limit ? parseFloat(b.limit) : null;

    const spendable =
      b.asset_type === "native"
        ? Math.round(Math.max(0, rawBalance - minimumReserveXlm - sellingLiabilities) * 1e7) / 1e7
        : Math.round(Math.max(0, rawBalance - sellingLiabilities) * 1e7) / 1e7;

    return {
      assetType: b.asset_type,
      assetCode: b.asset_code || "XLM",
      issuer: b.asset_issuer || null,
      identifier: getAssetIdentifier(b),
      balance: rawBalance,
      spendableBalance: spendable,
      sellingLiabilities,
      buyingLiabilities,
      limit,
      isAuthorized: b.is_authorized ?? true,
      liquidityPoolId: b.liquidity_pool_id || null,
    };
  });
}

/**
 * Finds the balance record for a specific asset.
 */
function findAssetBalance(account, asset) {
  const targetId = getAssetIdentifier(asset);
  const balances = parseAccountBalances(account);
  return balances.find((b) => b.identifier === targetId) || null;
}

/**
 * Checks whether the account has enough spendable balance for an operation.
 */
function hasSufficientSpendableBalance(account, asset, requestedAmount) {
  const req = parseFloat(requestedAmount);
  if (isNaN(req) || req <= 0) {
    throw new AssetBalanceError("Requested amount must be a positive number", "INVALID_AMOUNT");
  }
  const balanceRecord = findAssetBalance(account, asset);
  if (!balanceRecord) {
    return false;
  }
  if (!balanceRecord.isAuthorized) {
    return false;
  }
  return balanceRecord.spendableBalance >= req;
}

module.exports = {
  parseAccountBalances,
  findAssetBalance,
  hasSufficientSpendableBalance,
  getAssetIdentifier,
  BASE_RESERVE_XLM,
  AssetBalanceError,
};
