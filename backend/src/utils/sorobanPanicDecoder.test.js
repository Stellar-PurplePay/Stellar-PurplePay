"use strict";

const { classifySorobanPanic } = require("./sorobanPanicDecoder");

describe("sorobanPanicDecoder", () => {
  it("classifies Storage.MissingValue and flags non-retryable with remediation", () => {
    const raw = "HostError: Error(Storage, MissingValue)";
    const res = classifySorobanPanic(raw);

    expect(res.isPanic).toBe(true);
    expect(res.category).toBe("Storage");
    expect(res.subCode).toBe("MissingValue");
    expect(res.isRetryable).toBe(false);
    expect(res.remediation).toContain("restoreFootprint");
  });

  it("classifies Storage.EntryExpired and flags retryable with restore advice", () => {
    const raw = "Error(Storage, EntryExpired)";
    const res = classifySorobanPanic(raw);

    expect(res.category).toBe("Storage");
    expect(res.subCode).toBe("EntryExpired");
    expect(res.isRetryable).toBe(true);
    expect(res.remediation).toContain("RestoreFootprintOp");
  });

  it("classifies Budget.CpuLimitExceeded and flags retryable", () => {
    const raw = "HostError: Error(Budget, CpuLimitExceeded)";
    const res = classifySorobanPanic(raw);

    expect(res.category).toBe("Budget");
    expect(res.subCode).toBe("CpuLimitExceeded");
    expect(res.isRetryable).toBe(true);
    expect(res.userMessage).toContain("CPU instruction budget exceeded");
  });

  it("classifies Auth.MissingSignature and flags retryable with signature advice", () => {
    const raw = "Error(Auth, MissingSignature)";
    const res = classifySorobanPanic(raw);

    expect(res.category).toBe("Auth");
    expect(res.subCode).toBe("MissingSignature");
    expect(res.isRetryable).toBe(true);
    expect(res.remediation).toContain("sign the contract authorization envelope");
  });

  it("classifies WasmVm.Unreachable trap", () => {
    const raw = "Error(WasmVm, Unreachable)";
    const res = classifySorobanPanic(raw);

    expect(res.category).toBe("WasmVm");
    expect(res.subCode).toBe("Unreachable");
    expect(res.isRetryable).toBe(false);
    expect(res.remediation).toContain("require statement failed");
  });

  it("identifies budget exceeded via text heuristics", () => {
    const res = classifySorobanPanic("Transaction simulation failed: CPU limit exhausted for call");
    expect(res.category).toBe("Budget");
    expect(res.subCode).toBe("CpuLimitExceeded");
    expect(res.isRetryable).toBe(true);
  });

  it("returns unclassified report for standard errors", () => {
    const res = classifySorobanPanic("Network timeout connecting to Horizon");
    expect(res.isPanic).toBe(false);
    expect(res.category).toBe("General");
    expect(res.subCode).toBe("Unclassified");
    expect(res.isRetryable).toBe(false);
  });
});
