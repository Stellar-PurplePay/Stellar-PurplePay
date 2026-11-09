"use strict";

const { analyzeFootprint, FootprintAnalysisError } = require("./sorobanFootprintAnalyzer");

describe("sorobanFootprintAnalyzer", () => {
  it("analyzes read-only vs read-write keys correctly", () => {
    const mockTxData = {
      footprint: {
        read_only: ["key_contract_code", "key_instance"],
        read_write: ["key_escrow_storage_1"],
      },
    };

    const analysis = analyzeFootprint(mockTxData);

    expect(analysis.readOnlyCount).toBe(2);
    expect(analysis.readWriteCount).toBe(1);
    expect(analysis.hasStateModifications).toBe(true);
  });

  it("detects conflict between two transactions writing to the same key", () => {
    const tx1 = analyzeFootprint({
      footprint: {
        read_only: ["shared_read_key"],
        read_write: ["target_key"],
      },
    });

    const tx2 = analyzeFootprint({
      footprint: {
        read_only: ["other_key"],
        read_write: ["target_key"], // Conflict on target_key!
      },
    });

    expect(tx1.conflictsWith(tx2)).toBe(true);
    expect(tx2.conflictsWith(tx1)).toBe(true);
  });

  it("detects no conflict between two purely read-only transactions", () => {
    const tx1 = analyzeFootprint({
      footprint: {
        read_only: ["shared_read_key"],
        read_write: [],
      },
    });

    const tx2 = analyzeFootprint({
      footprint: {
        read_only: ["shared_read_key"],
        read_write: [],
      },
    });

    expect(tx1.conflictsWith(tx2)).toBe(false);
  });

  it("throws FootprintAnalysisError on invalid input", () => {
    expect(() => analyzeFootprint(null)).toThrow(FootprintAnalysisError);
    expect(() => analyzeFootprint({})).toThrow(FootprintAnalysisError);
  });
});
