"use strict";

const express = require("express");
const request = require("supertest");

jest.mock("../db/pool", () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ 1: 1 }] }),
  getPoolStats: jest.fn().mockReturnValue({ totalCount: 5, idleCount: 4, waitingCount: 0 }),
}));

jest.mock("../services/cacheService", () => ({
  ping: jest.fn().mockResolvedValue("up"),
}));

jest.mock("../services/sorobanClient", () => ({
  getServer: jest.fn().mockReturnValue({
    getLatestLedger: jest.fn().mockResolvedValue({ sequence: 123456 }),
  }),
}));

jest.mock("../services/contractVersionService", () => ({
  getContractVersion: jest.fn().mockResolvedValue("1.2.0"),
}));

const healthRouter = require("./health");

describe("Health Routes", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals = {};
    app.use("/api/health", healthRouter);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        _embedded: { records: [{ sequence: 987654 }] },
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/health returns healthy status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.database).toBe("up");
    expect(res.body.redis).toBe("up");
    expect(res.body.stellar).toBe("up");
    expect(res.body.soroban).toBe("up");
  });

  it("GET /api/health/db returns connection pool metrics", async () => {
    const res = await request(app).get("/api/health/db");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.pool.totalCount).toBe(5);
  });

  it("GET /api/health/deep returns component latencies and system diagnostics", async () => {
    const res = await request(app).get("/api/health/deep");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.checks.db).toHaveProperty("latency_ms");
    expect(res.body.checks.redis).toHaveProperty("latency_ms");
    expect(res.body.checks.horizon).toHaveProperty("latency_ms");
    expect(res.body.checks.soroban).toHaveProperty("latency_ms");
    expect(res.body.memory).toHaveProperty("heapUsedMb");
  });
});
