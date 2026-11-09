"use strict";

const {
  validateFootprintBounds,
  FootprintValidationError,
  MAX_READ_ONLY_KEYS,
  MAX_READ_WRITE_KEYS,
  MAX_TOTAL_KEYS,
} = require("./sorobanFootprintValidator");

describe("sorobanFootprintValidator", () => {
  it("rejects non-object or null input", () => {
    expect(() => validateFootprintBounds(null)).toThrow(FootprintValidationError);
    expect(() => validateFootprintBounds("bad")).toThrow(FootprintValidationError);
  });

  it("validates a healthy disjoint footprint successfully", () => {
    const footprint = {
      readOnly: ["key1", "key2", "key3"],
      readWrite: ["key4", "key5"],
    };

    const result = validateFootprintBounds(footprint);
    expect(result.valid).toBe(true);
    expect(result.readOnlyCount).toBe(3);
    expect(result.readWriteCount).toBe(2);
    expect(result.totalKeys).toBe(5);
  });

  it("handles snake_case read_only and read_write keys", () => {
    const footprint = {
      read_only: ["k1"],
      read_write: ["k2"],
    };

    const result = validateFootprintBounds(footprint);
    expect(result.valid).toBe(true);
    expect(result.totalKeys).toBe(2);
  });

  it("rejects overlapping keys between read-only and read-write", () => {
    const footprint = {
      readOnly: ["contract_instance", "token_state"],
      readWrite: ["token_state", "escrow_data"],
    };

    expect(() => validateFootprintBounds(footprint)).toThrow(
      /exists in both read-only and read-write sections/
    );
  });

  it("rejects read-only count exceeding limit", () => {
    const footprint = {
      readOnly: Array.from({ length: MAX_READ_ONLY_KEYS + 1 }, (_, i) => `ro_${i}`),
      readWrite: [],
    };

    expect(() => validateFootprintBounds(footprint)).toThrow(
      /exceeds maximum read-only entry limit/
    );
  });

  it("rejects read-write count exceeding limit", () => {
    const footprint = {
      readOnly: [],
      readWrite: Array.from({ length: MAX_READ_WRITE_KEYS + 1 }, (_, i) => `rw_${i}`),
    };

    expect(() => validateFootprintBounds(footprint)).toThrow(
      /exceeds maximum read-write entry limit/
    );
  });

  it("rejects total count exceeding limit", () => {
    const footprint = {
      readOnly: Array.from({ length: 30 }, (_, i) => `ro_${i}`),
      readWrite: Array.from({ length: 25 }, (_, i) => `rw_${i}`), // 30 + 25 = 55 > 50
    };

    expect(() => validateFootprintBounds(footprint)).toThrow(
      /exceeds maximum total entry limit/
    );
  });
});
