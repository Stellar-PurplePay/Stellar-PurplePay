"use strict";

const MAX_READ_ONLY_KEYS = 40;
const MAX_READ_WRITE_KEYS = 25;
const MAX_TOTAL_KEYS = 50;

class FootprintValidationError extends Error {
  constructor(message, code = "INVALID_FOOTPRINT") {
    super(message);
    this.name = "FootprintValidationError";
    this.code = code;
    this.status = 400;
  }
}

/**
 * Validates that a Soroban transaction footprint strictly conforms to network safety bounds.
 *
 * @param {object} footprint - Object with readOnly and readWrite key arrays
 * @param {object} [customLimits] - Optional custom bounds
 * @returns {{ valid: boolean, totalKeys: number, readOnlyCount: number, readWriteCount: number }}
 */
function validateFootprintBounds(footprint, customLimits = {}) {
  if (!footprint || typeof footprint !== "object") {
    throw new FootprintValidationError("Footprint must be a valid non-null object");
  }

  const readOnly = Array.isArray(footprint.readOnly)
    ? footprint.readOnly
    : Array.isArray(footprint.read_only)
    ? footprint.read_only
    : [];

  const readWrite = Array.isArray(footprint.readWrite)
    ? footprint.readWrite
    : Array.isArray(footprint.read_write)
    ? footprint.read_write
    : [];

  const maxReadOnly = customLimits.maxReadOnly || MAX_READ_ONLY_KEYS;
  const maxReadWrite = customLimits.maxReadWrite || MAX_READ_WRITE_KEYS;
  const maxTotal = customLimits.maxTotal || MAX_TOTAL_KEYS;

  if (readOnly.length > maxReadOnly) {
    throw new FootprintValidationError(
      `Footprint exceeds maximum read-only entry limit: ${readOnly.length} > ${maxReadOnly}`,
      "READ_ONLY_LIMIT_EXCEEDED"
    );
  }

  if (readWrite.length > maxReadWrite) {
    throw new FootprintValidationError(
      `Footprint exceeds maximum read-write entry limit: ${readWrite.length} > ${maxReadWrite}`,
      "READ_WRITE_LIMIT_EXCEEDED"
    );
  }

  const totalKeys = readOnly.length + readWrite.length;
  if (totalKeys > maxTotal) {
    throw new FootprintValidationError(
      `Footprint exceeds maximum total entry limit: ${totalKeys} > ${maxTotal}`,
      "TOTAL_LIMIT_EXCEEDED"
    );
  }

  // Ensure mutually exclusive sets: A key cannot be in both read-only and read-write
  const roSet = new Set(readOnly.map(String));
  for (const rwKey of readWrite) {
    const keyStr = String(rwKey);
    if (roSet.has(keyStr)) {
      throw new FootprintValidationError(
        `Invalid footprint: Key "${keyStr}" exists in both read-only and read-write sections`,
        "OVERLAPPING_FOOTPRINT_KEYS"
      );
    }
  }

  return {
    valid: true,
    totalKeys,
    readOnlyCount: readOnly.length,
    readWriteCount: readWrite.length,
  };
}

module.exports = {
  MAX_READ_ONLY_KEYS,
  MAX_READ_WRITE_KEYS,
  MAX_TOTAL_KEYS,
  FootprintValidationError,
  validateFootprintBounds,
};
