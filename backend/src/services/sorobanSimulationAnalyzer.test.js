"use strict";

const {
  analyzeSimulationResult,
  MAX_SOROBAN_CPU_INSTRUCTIONS,
  SimulationAnalysisError,
} = require("./sorobanSimulationAnalyzer");

describe("sorobanSimulationAnalyzer", () => {
  it("extracts resource consumption and fees from successful simulation", () => {
    const mockSuccess = {
      cost: {
        cpuInsns: "1500000",
        memBytes: "500000",
      },
      minResourceFee: "15000",
      results: [
        {
          auth: [
            {
              credentials: {
                address: () => "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
              },
            },
          ],
        },
      ],
      events: [{ id: "evt-1" }],
    };

    const diag = analyzeSimulationResult(mockSuccess);

    expect(diag.success).toBe(true);
    expect(diag.cpuConsumed).toBe(1500000);
    expect(diag.memoryConsumed).toBe(500000);
    expect(diag.minResourceFee).toBe("15000");
    expect(diag.requiredSigners).toContain("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(diag.eventsCount).toBe(1);
    expect(diag.warnings).toHaveLength(0);
  });

  it("adds warning when CPU consumption exceeds 80% limit", () => {
    const highCpu = Math.floor(MAX_SOROBAN_CPU_INSTRUCTIONS * 0.85);
    const mockHighCost = {
      cost: {
        cpuInsns: String(highCpu),
        memBytes: "1000",
      },
      minResourceFee: "50000",
      results: [],
    };

    const diag = analyzeSimulationResult(mockHighCost);
    expect(diag.warnings.some((w) => w.includes("CPU instructions"))).toBe(true);
  });

  it("handles simulation error response gracefully", () => {
    const mockError = {
      error: "HostError: Error(Contract, #1)",
      events: [],
    };

    const diag = analyzeSimulationResult(mockError);
    expect(diag.success).toBe(false);
    expect(diag.error).toContain("HostError");
    expect(diag.warnings).toContain("Contract simulation failed execution");
  });

  it("throws SimulationAnalysisError when result is missing", () => {
    expect(() => analyzeSimulationResult(null)).toThrow(SimulationAnalysisError);
  });
});
