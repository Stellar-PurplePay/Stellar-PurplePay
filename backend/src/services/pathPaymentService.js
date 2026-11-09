"use strict";

const { Asset, Operation } = require("@stellar/stellar-sdk");
const { callWithLimit } = require("../utils/horizonClient");

class PathPaymentError extends Error {
  constructor(message, code = "PATH_PAYMENT_ERROR") {
    super(message);
    this.name = "PathPaymentError";
    this.code = code;
  }
}

/**
 * Finds the best path payment strict-receive quote and applies slippage bounds.
 *
 * @param {Horizon.Server} horizonServer
 * @param {object} params
 * @param {string|Asset} params.sourceAccountOrAsset
 * @param {Asset} params.destinationAsset
 * @param {string|number} params.destinationAmount
 * @param {number} [params.maxSlippagePercent=1.0]
 * @returns {Promise<object>} Best path quote and Operation builder
 */
async function getBestStrictReceiveQuote(horizonServer, params) {
  const {
    sourceAccountOrAsset,
    destinationAsset,
    destinationAmount,
    maxSlippagePercent = 1.0,
  } = params;

  if (!destinationAsset || !destinationAmount) {
    throw new PathPaymentError("destinationAsset and destinationAmount are required", "MISSING_PARAMS");
  }

  const pathsCall = horizonServer.strictReceivePaths(
    sourceAccountOrAsset,
    destinationAsset,
    String(destinationAmount)
  );

  const response = await callWithLimit(() => pathsCall.call(), "strictReceivePaths");
  const records = response.records || [];

  if (records.length === 0) {
    throw new PathPaymentError("No viable payment path found on Stellar DEX", "NO_PATH_FOUND");
  }

  // Sort paths by lowest source_amount required
  records.sort((a, b) => parseFloat(a.source_amount) - parseFloat(b.source_amount));
  const bestRecord = records[0];

  const nominalSourceAmount = parseFloat(bestRecord.source_amount);
  const slippageMultiplier = 1 + Math.max(0, maxSlippagePercent) / 100;
  const sendMax = (nominalSourceAmount * slippageMultiplier).toFixed(7);

  // Map path assets
  const path = (bestRecord.path || []).map((p) => {
    if (p.asset_type === "native") return Asset.native();
    return new Asset(p.asset_code, p.asset_issuer);
  });

  const sourceAsset =
    bestRecord.source_asset_type === "native"
      ? Asset.native()
      : new Asset(bestRecord.source_asset_code, bestRecord.source_asset_issuer);

  return {
    sourceAsset,
    destinationAsset,
    destinationAmount: String(destinationAmount),
    nominalSourceAmount: String(nominalSourceAmount),
    sendMax,
    path,
    buildOperation: (destinationAddress) =>
      Operation.pathPaymentStrictReceive({
        sendAsset: sourceAsset,
        sendMax,
        destination: destinationAddress,
        destAsset: destinationAsset,
        destAmount: String(destinationAmount),
        path,
      }),
  };
}

/**
 * Finds the best path payment strict-send quote and applies slippage bounds.
 */
async function getBestStrictSendQuote(horizonServer, params) {
  const {
    sourceAsset,
    sourceAmount,
    destinationAccountOrAssets,
    maxSlippagePercent = 1.0,
  } = params;

  if (!sourceAsset || !sourceAmount) {
    throw new PathPaymentError("sourceAsset and sourceAmount are required", "MISSING_PARAMS");
  }

  const pathsCall = horizonServer.strictSendPaths(
    sourceAsset,
    String(sourceAmount),
    destinationAccountOrAssets
  );

  const response = await callWithLimit(() => pathsCall.call(), "strictSendPaths");
  const records = response.records || [];

  if (records.length === 0) {
    throw new PathPaymentError("No viable payment path found on Stellar DEX", "NO_PATH_FOUND");
  }

  // Sort paths by highest destination_amount yielded
  records.sort((a, b) => parseFloat(b.destination_amount) - parseFloat(a.destination_amount));
  const bestRecord = records[0];

  const nominalDestAmount = parseFloat(bestRecord.destination_amount);
  const slippageMultiplier = 1 - Math.max(0, maxSlippagePercent) / 100;
  const destMin = Math.max(0, nominalDestAmount * slippageMultiplier).toFixed(7);

  const path = (bestRecord.path || []).map((p) => {
    if (p.asset_type === "native") return Asset.native();
    return new Asset(p.asset_code, p.asset_issuer);
  });

  const destinationAsset =
    bestRecord.destination_asset_type === "native"
      ? Asset.native()
      : new Asset(bestRecord.destination_asset_code, bestRecord.destination_asset_issuer);

  return {
    sourceAsset,
    sourceAmount: String(sourceAmount),
    destinationAsset,
    nominalDestAmount: String(nominalDestAmount),
    destMin,
    path,
    buildOperation: (destinationAddress) =>
      Operation.pathPaymentStrictSend({
        sendAsset: sourceAsset,
        sendAmount: String(sourceAmount),
        destination: destinationAddress,
        destAsset: destinationAsset,
        destMin,
        path,
      }),
  };
}

module.exports = {
  getBestStrictReceiveQuote,
  getBestStrictSendQuote,
  PathPaymentError,
};
