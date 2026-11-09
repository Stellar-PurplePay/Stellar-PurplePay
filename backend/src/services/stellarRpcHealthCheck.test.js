"use strict";

const { StellarRpcHealthCheck } = require("./stellarRpcHealthCheck");

describe("stellarRpcHealthCheck", () => {
  let healthChecker;

  beforeEach(() => {
    healthChecker = new StellarRpcHealthCheck({
      sorobanRpcUrl: "https://mock-rpc.stellar.org",
      horizonUrl: "https://mock-horizon.stellar.org",
      timeoutMs: 1000,
    });
  });

  it("reports healthy when both Soroban and Horizon respond promptly", async () => {
    const mockHttpClient = {
      post: jest.fn().mockResolvedValue({
        data: {
          result: { sequence: 123456 },
        },
      }),
      get: jest.fn().mockResolvedValue({
        data: {
          core_latest_ledger: 123456,
          network_passphrase: "Test SDF Network ; September 2015",
        },
      }),
    };

    const health = await healthChecker.getCombinedHealth(mockHttpClient);

    expect(health.status).toBe("healthy");
    expect(health.sorobanRpc.latestLedger).toBe(123456);
    expect(health.horizon.networkPassphrase).toContain("Test SDF");
  });

  it("reports unhealthy when Soroban RPC request fails", async () => {
    const mockHttpClient = {
      post: jest.fn().mockRejectedValue(new Error("Connection refused")),
      get: jest.fn().mockResolvedValue({
        data: { core_latest_ledger: 123456 },
      }),
    };

    const health = await healthChecker.getCombinedHealth(mockHttpClient);

    expect(health.status).toBe("unhealthy");
    expect(health.sorobanRpc.status).toBe("unhealthy");
    expect(health.sorobanRpc.error).toContain("Connection refused");
  });
});
