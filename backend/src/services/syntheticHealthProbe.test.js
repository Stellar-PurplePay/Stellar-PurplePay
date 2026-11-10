"use strict";

const {
  runSyntheticHealthCheck,
  checkDatabaseHealth,
  checkHorizonHealth,
  checkSorobanRpcHealth,
} = require("./syntheticHealthProbe");

describe("syntheticHealthProbe", () => {
  it("reports healthy when all subsystems respond successfully", async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [{ ping: 1 }] }),
    };

    const mockFetch = jest.fn().mockImplementation((url, opts) => {
      if (url.includes("horizon")) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ result: { status: "healthy" } }),
      });
    });

    const result = await runSyntheticHealthCheck({
      pool: mockPool,
      horizonUrl: "https://horizon.example.com",
      rpcUrl: "https://rpc.example.com",
      fetchFn: mockFetch,
    });

    expect(result.status).toBe("healthy");
    expect(result.checks.database.status).toBe("healthy");
    expect(result.checks.horizon.status).toBe("healthy");
    expect(result.checks.sorobanRpc.status).toBe("healthy");
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it("reports unhealthy when database query fails", async () => {
    const mockPool = {
      query: jest.fn().mockRejectedValue(new Error("Connection terminated")),
    };

    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await runSyntheticHealthCheck({
      pool: mockPool,
      horizonUrl: "https://horizon.example.com",
      rpcUrl: "https://rpc.example.com",
      fetchFn: mockFetch,
    });

    expect(result.status).toBe("unhealthy");
    expect(result.checks.database.status).toBe("unhealthy");
    expect(result.checks.database.error).toContain("Connection terminated");
  });

  it("reports degraded when Horizon returns 503", async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [{ ping: 1 }] }),
    };

    const mockFetch = jest.fn().mockImplementation((url) => {
      if (url.includes("horizon")) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ result: { status: "healthy" } }),
      });
    });

    const result = await runSyntheticHealthCheck({
      pool: mockPool,
      horizonUrl: "https://horizon.example.com",
      rpcUrl: "https://rpc.example.com",
      fetchFn: mockFetch,
    });

    expect(result.status).toBe("degraded");
    expect(result.checks.horizon.status).toBe("degraded");
  });

  it("handles skipped checks when components are omitted", async () => {
    const dbRes = await checkDatabaseHealth(null);
    expect(dbRes.status).toBe("skipped");

    const horizRes = await checkHorizonHealth("");
    expect(horizRes.status).toBe("skipped");

    const rpcRes = await checkSorobanRpcHealth("");
    expect(rpcRes.status).toBe("skipped");
  });
});
