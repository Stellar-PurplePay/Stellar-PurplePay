/**
 * src/utils/stroopConverter.js
 * High-precision, type-safe conversions between XLM and Stroops (1 XLM = 10^7 Stroops)
 *
 * Prevents IEEE-754 double precision floating-point inaccuracies and micro-stroop theft.
 */
"use strict";

const STROOPS_PER_XLM = 10_000_000n;
const MAX_DECIMAL_PLACES = 7;

class StroopConversionError extends Error {
  constructor(message) {
    super(message);
    this.name = "StroopConversionError";
    this.status = 400;
  }
}

/**
 * Converts an XLM string or number to an exact BigInt stroop quantity.
 *
 * @param {string|number} xlmAmount - Amount in XLM (e.g. "100.5" or 25)
 * @returns {bigint} - Exact integer stroops
 * @throws {StroopConversionError} If format is invalid or precision exceeds 7 decimals
 */
function xlmToStroops(xlmAmount) {
  if (xlmAmount === undefined || xlmAmount === null) {
    throw new StroopConversionError("XLM amount is required");
  }

  const raw = String(xlmAmount).trim();
  if (!raw) {
    throw new StroopConversionError("XLM amount cannot be empty");
  }

  // Reject scientific notation
  if (/[eE]/.test(raw)) {
    throw new StroopConversionError("Scientific notation is not supported for financial calculations");
  }

  // Validate decimal number format
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new StroopConversionError(`Invalid XLM amount format: "${raw}"`);
  }

  const [integerPart, decimalPart = ""] = raw.split(".");

  if (decimalPart.length > MAX_DECIMAL_PLACES) {
    throw new StroopConversionError(
      `XLM amount exceeds maximum Stellar precision of ${MAX_DECIMAL_PLACES} decimal places`
    );
  }

  const paddedDecimal = decimalPart.padEnd(MAX_DECIMAL_PLACES, "0");
  const stroops = BigInt(integerPart) * STROOPS_PER_XLM + BigInt(paddedDecimal);

  return stroops;
}

/**
 * Converts a BigInt stroop quantity into a human-readable, fixed-precision XLM string.
 *
 * @param {bigint|string|number} stroops - Amount in stroops
 * @returns {string} - XLM string representation (e.g. "12.3456789")
 */
function stroopsToXlm(stroops) {
  if (stroops === undefined || stroops === null) {
    throw new StroopConversionError("Stroop amount is required");
  }

  let stroopBigInt;
  try {
    stroopBigInt = BigInt(stroops);
  } catch {
    throw new StroopConversionError(`Invalid stroop value: "${stroops}"`);
  }

  if (stroopBigInt < 0n) {
    throw new StroopConversionError("Stroop amount cannot be negative");
  }

  const integerPart = stroopBigInt / STROOPS_PER_XLM;
  const remainder = stroopBigInt % STROOPS_PER_XLM;

  if (remainder === 0n) {
    return integerPart.toString();
  }

  const remainderStr = remainder.toString().padStart(MAX_DECIMAL_PLACES, "0");
  // Trim unnecessary trailing zeros
  const trimmed = remainderStr.replace(/0+$/, "");
  return `${integerPart}.${trimmed}`;
}

/**
 * Calculates platform fee in stroops according to basis points (bps) without rounding loss.
 *
 * @param {bigint|string} grossStroops - Total amount in stroops
 * @param {number} feeBps - Fee in basis points (1 bps = 0.01%, 100 bps = 1%)
 * @returns {{ feeStroops: bigint, netStroops: bigint }}
 */
function calculateFeeSplit(grossStroops, feeBps) {
  const gross = BigInt(grossStroops);
  if (gross < 0n) throw new StroopConversionError("Gross stroops cannot be negative");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000) {
    throw new StroopConversionError("feeBps must be an integer between 0 and 10,000");
  }

  const feeStroops = (gross * BigInt(feeBps)) / 10000n;
  const netStroops = gross - feeStroops;

  return { feeStroops, netStroops };
}

module.exports = {
  STROOPS_PER_XLM,
  MAX_DECIMAL_PLACES,
  StroopConversionError,
  xlmToStroops,
  stroopsToXlm,
  calculateFeeSplit,
};
