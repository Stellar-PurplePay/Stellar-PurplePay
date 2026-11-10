"use strict";

const {
  recordRpcCall,
  recordSorobanResources,
  getMetricsAsText,
  resetMetrics,
  rpcRequestsCounter,
  cpuInstructionsCounter,
} = require("./sorobanMetrics");

describe("sorobanMetrics exporter", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("records successful RPC call and observes latency", async () => {
    recordRpcCall("simulateTransaction", 0.125, "success", "none");

    const text = await getMetricsAsText();
    expect(text).toContain("soroban_rpc_requests_total");
    expect(text).toContain('method="simulateTransaction"');
    expect(text).toContain('status="success"');
    expect(text).toContain('error_code="none"');
    expect(text).toContain("soroban_rpc_duration_seconds_bucket");
  });

  it("records error RPC call with error code label", async () => {
    recordRpcCall("sendTransaction", 0.05, "error", "RATE_LIMIT_EXCEEDED");

    const text = await getMetricsAsText();
    expect(text).toContain('status="error"');
    expect(text).toContain('error_code="RATE_LIMIT_EXCEEDED"');
  });

  it("accumulates resource metrics accurately", async () => {
    recordSorobanResources("create_escrow", {
      cpuInstructions: 1500000,
      memoryBytes: 45000,
      feeStroops: 2500,
    });

    const text = await getMetricsAsText();
    expect(text).toContain("soroban_tx_cpu_instructions_total");
    expect(text).toContain('operation="create_escrow"');
    expect(text).toContain("1500000");
    expect(text).toContain("soroban_tx_memory_bytes_total");
    expect(text).toContain("45000");
    expect(text).toContain("soroban_tx_fee_stroops_total");
    expect(text).toContain("2500");
  });

  it("resets metrics cleanly", async () => {
    recordRpcCall("getEvents", 0.1, "success");
    resetMetrics();

    const text = await getMetricsAsText();
    // No method labels should remain after reset
    expect(text).not.toContain('method="getEvents"');
  });
});
