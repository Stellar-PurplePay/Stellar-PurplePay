import { analyzeSimulationResponse } from "../lib/preflightSimulator";

describe("preflightSimulator", () => {
  it("fails gracefully when simulation response is invalid", () => {
    expect(analyzeSimulationResponse(null)).toEqual({
      success: false,
      errorDetail: "Simulation response was empty or malformed",
    });
  });

  it("extracts error detail when simulation returns host or contract error", () => {
    const simErr = {
      error: "HostError: Error(Contract, #19)", // ContractPaused
    };
    const res = analyzeSimulationResponse(simErr);
    expect(res.success).toBe(false);
    expect(res.errorDetail).toBe("HostError: Error(Contract, #19)");
  });

  it("parses successful simulation and converts minResourceFee to XLM", () => {
    const simSuccess = {
      minResourceFee: "250000",
      cost: {
        cpuInsns: "1500000",
        memBytes: "65000",
      },
      retval: "AAAAAw==",
    };

    const res = analyzeSimulationResponse(simSuccess);
    expect(res.success).toBe(true);
    expect(res.cost).toBeDefined();
    expect(res.cost?.minResourceFeeStroops).toBe(250000);
    expect(res.cost?.minResourceFeeXlm).toBe("0.0250000");
    expect(res.cost?.cpuInstructions).toBe(1500000);
    expect(res.cost?.memoryBytes).toBe(65000);
    expect(res.returnValue).toBe("AAAAAw==");
  });
});
