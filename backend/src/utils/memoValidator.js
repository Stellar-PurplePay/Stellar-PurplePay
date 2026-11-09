"use strict";

const { Memo, MemoNone, MemoText, MemoId, MemoHash, MemoReturn } = require("@stellar/stellar-sdk");

/**
 * Validates and constructs Stellar Memo objects with strict SEP-compliant byte-length
 * and data-type constraints.
 */

const MAX_MEMO_TEXT_BYTES = 28;
const MAX_UINT64 = BigInt("18446744073709551615");
const HEX_32_BYTE_REGEX = /^[0-9a-fA-F]{64}$/;

class MemoValidationError extends Error {
  constructor(message, code = "INVALID_MEMO") {
    super(message);
    this.name = "MemoValidationError";
    this.code = code;
    this.status = 400;
  }
}

/**
 * Validates text memo ensuring UTF-8 encoded byte count <= 28.
 * @param {string} text
 * @returns {Memo}
 */
function validateMemoText(text) {
  if (typeof text !== "string") {
    throw new MemoValidationError("MEMO_TEXT must be a string", "MEMO_TEXT_TYPE");
  }
  const byteLength = Buffer.byteLength(text, "utf8");
  if (byteLength > MAX_MEMO_TEXT_BYTES) {
    throw new MemoValidationError(
      `MEMO_TEXT exceeds 28-byte limit (received ${byteLength} bytes)`,
      "MEMO_TEXT_OVERFLOW"
    );
  }
  return Memo.text(text);
}

/**
 * Validates ID memo ensuring unsigned 64-bit integer representation.
 * @param {string|number|bigint} id
 * @returns {Memo}
 */
function validateMemoId(id) {
  if (id === null || id === undefined) {
    throw new MemoValidationError("MEMO_ID cannot be null or undefined", "MEMO_ID_EMPTY");
  }
  const strId = String(id).trim();
  if (!/^\d+$/.test(strId)) {
    throw new MemoValidationError("MEMO_ID must contain digits only", "MEMO_ID_NAN");
  }
  try {
    const bigVal = BigInt(strId);
    if (bigVal < 0n || bigVal > MAX_UINT64) {
      throw new MemoValidationError(
        "MEMO_ID exceeds uint64 bounds (0 to 18446744073709551615)",
        "MEMO_ID_OUT_OF_BOUNDS"
      );
    }
  } catch (err) {
    throw new MemoValidationError(`Invalid MEMO_ID integer format: ${err.message}`, "MEMO_ID_FORMAT");
  }
  return Memo.id(strId);
}

/**
 * Validates 32-byte hash memo.
 * @param {string|Buffer} hash
 * @returns {Memo}
 */
function validateMemoHash(hash) {
  if (Buffer.isBuffer(hash)) {
    if (hash.length !== 32) {
      throw new MemoValidationError(
        `MEMO_HASH buffer must be exactly 32 bytes (received ${hash.length})`,
        "MEMO_HASH_LENGTH"
      );
    }
    return Memo.hash(hash);
  }
  if (typeof hash === "string") {
    const cleanHex = hash.trim();
    if (!HEX_32_BYTE_REGEX.test(cleanHex)) {
      throw new MemoValidationError(
        "MEMO_HASH must be a 64-character hexadecimal string or 32-byte buffer",
        "MEMO_HASH_FORMAT"
      );
    }
    return Memo.hash(cleanHex);
  }
  throw new MemoValidationError("MEMO_HASH must be a hex string or Buffer", "MEMO_HASH_TYPE");
}

/**
 * Validates 32-byte return memo.
 * @param {string|Buffer} hash
 * @returns {Memo}
 */
function validateMemoReturn(hash) {
  if (Buffer.isBuffer(hash)) {
    if (hash.length !== 32) {
      throw new MemoValidationError(
        `MEMO_RETURN buffer must be exactly 32 bytes (received ${hash.length})`,
        "MEMO_RETURN_LENGTH"
      );
    }
    return Memo.return(hash);
  }
  if (typeof hash === "string") {
    const cleanHex = hash.trim();
    if (!HEX_32_BYTE_REGEX.test(cleanHex)) {
      throw new MemoValidationError(
        "MEMO_RETURN must be a 64-character hexadecimal string or 32-byte buffer",
        "MEMO_RETURN_FORMAT"
      );
    }
    return Memo.return(cleanHex);
  }
  throw new MemoValidationError("MEMO_RETURN must be a hex string or Buffer", "MEMO_RETURN_TYPE");
}

/**
 * Parse and validate memo from generic payload: { type: 'text'|'id'|'hash'|'return'|'none', value: any }
 * @param {{ type?: string, value?: any }} memoObj
 * @returns {Memo}
 */
function parseAndValidateMemo(memoObj) {
  if (!memoObj || !memoObj.type || memoObj.type.toLowerCase() === "none") {
    return Memo.none();
  }
  const type = memoObj.type.toLowerCase();
  switch (type) {
    case "text":
      return validateMemoText(memoObj.value);
    case "id":
      return validateMemoId(memoObj.value);
    case "hash":
      return validateMemoHash(memoObj.value);
    case "return":
      return validateMemoReturn(memoObj.value);
    default:
      throw new MemoValidationError(
        `Unsupported memo type: '${memoObj.type}'. Must be 'text', 'id', 'hash', 'return', or 'none'.`,
        "MEMO_TYPE_UNKNOWN"
      );
  }
}

module.exports = {
  validateMemoText,
  validateMemoId,
  validateMemoHash,
  validateMemoReturn,
  parseAndValidateMemo,
  MemoValidationError,
  MAX_MEMO_TEXT_BYTES,
};
