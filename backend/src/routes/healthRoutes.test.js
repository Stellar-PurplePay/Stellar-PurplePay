"use strict";

const express = require("express");
const request = require("supertest");
const healthRoutes = require("./healthRoutes");
const stellarRpcHealthCheck = require("../services/stellarRpcHealthCheck");

jest.mock("../services/stellarRpcHealthCheck");

describe("healthRoutes", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use("/api/health", healthRoutes);
  });

  it("returns 200 with health metrics when nodes are healthy", async () => {
    stellarRpcHealthCheck.getCombinedHealth.mockResolvedValue({
      status: "healthy",
      timestamp: new Date().toISOString(),
      sorobanRpc: { status: "healthy", latencyMs: 120, latestLedger: 99999 },
      horizon: { status: "healthy", latencyMs: 80, coreLatestLedger: 99999 },
    });

    const res = await request(app).get("/api/health/stellar");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.sorobanRpc.latencyMs).toBe(120);
  });

  it("returns 503 when nodes are unhealthy", async () => {
    stellarRpcHealthCheck.getCombinedHealth.mockResolvedValue({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      sorobanRpc: { status: "unhealthy", error: "RPC timeout" },
      horizon: { status: "healthy" },
    });

    const res = await request(app).get("/api/health/stellar");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("unhealthy");
  });
});
