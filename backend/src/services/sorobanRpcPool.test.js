"use strict";

const { SorobanRpcPool, RpcPoolExhaustedError } = require("./sorobanRpcPool");

describe("SorobanRpcPool", () => {
  const endpoints = [
    "https://primary-rpc.stellar.org",
    "https://secondary-rpc.stellar.org",
  ];

  it("initializes with endpoints in healthy state", () => {
    const pool = new SorobanRpcPool(endpoints);
    const status = pool.getStatus();
    expect(status).toHaveLength(2);
    expect(status[0].url).toBe(endpoints[0]);
    expect(status[0].healthy).toBe(true);
  });

  it("returns primary server when healthy", () => {
    const pool = new SorobanRpcPool(endpoints);
    const server = pool.getActiveServer();
    expect(server).toBeDefined();
  });

  it("rotates to backup node when primary fails during executeWithFailover", async () => {
    const pool = new SorobanRpcPool(endpoints);

    // Primary fails, secondary succeeds
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error("Primary down"))
      .mockResolvedValueOnce({ sequence: 54321 });

    const result = await pool.executeWithFailover(operation);

    expect(result).toEqual({ sequence: 54321 });
    expect(operation).toHaveBeenCalledTimes(2);

    const status = pool.getStatus();
    expect(status[0].healthy).toBe(false);
    expect(status[1].healthy).toBe(true);
  });

  it("throws RpcPoolExhaustedError when all endpoints fail", async () => {
    const pool = new SorobanRpcPool(endpoints);
    const operation = jest.fn().mockRejectedValue(new Error("Endpoint unreachable"));

    await expect(pool.executeWithFailover(operation)).rejects.toThrow(RpcPoolExhaustedError);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("probeNode updates node latency on successful response", async () => {
    const pool = new SorobanRpcPool(endpoints);
    const node = pool.nodes[0];
    node.server.getLatestLedger = jest.fn().mockResolvedValue({ sequence: 100 });

    const ok = await pool.probeNode(node);
    expect(ok).toBe(true);
    expect(node.healthy).toBe(true);
    expect(node.latencyMs).toBeGreaterThanOrEqual(0);
    expect(node.consecutiveFailures).toBe(0);
  });
});
