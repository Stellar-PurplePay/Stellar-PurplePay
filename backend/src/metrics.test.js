"use strict";

const {
  registry,
  recordSorobanRpcCall,
  sorobanRpcRequestsTotal,
  sorobanRpcDurationMs,
  renderMetrics,
  sqlOperation,
  normalizeRoutePath,
} = require("./metrics");

describe("metrics registry", () => {
  it("records Soroban RPC metrics with method and duration", async () => {
    recordSorobanRpcCall("simulateTransaction", "success", 125);
    recordSorobanRpcCall("getLatestLedger", "error", 450);

    const metricsText = await renderMetrics();
    expect(metricsText).toContain("purplepay_soroban_rpc_requests_total");
    expect(metricsText).toContain('method="simulateTransaction"');
    expect(metricsText).toContain('status="success"');
    expect(metricsText).toContain("purplepay_soroban_rpc_duration_ms");
  });

  it("extracts clean SQL operations for query metrics", () => {
    expect(sqlOperation("SELECT * FROM jobs")).toBe("select");
    expect(sqlOperation("INSERT INTO jobs VALUES ($1)")).toBe("insert");
    expect(sqlOperation("UPDATE escrows SET status = 'released'")).toBe("update");
    expect(sqlOperation("DELETE FROM tokens")).toBe("delete");
    expect(sqlOperation("")).toBe("other");
  });

  it("normalizes variable route segments to bound metric cardinality", () => {
    expect(normalizeRoutePath("/api/jobs/12345/bids")).toBe("/api/jobs/:id/bids");
    expect(
      normalizeRoutePath("/api/escrow/123e4567-e89b-12d3-a456-426614174000/release")
    ).toBe("/api/escrow/:id/release");
    expect(
      normalizeRoutePath("/api/profiles/GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ")
    ).toBe("/api/profiles/:id");
  });
});
