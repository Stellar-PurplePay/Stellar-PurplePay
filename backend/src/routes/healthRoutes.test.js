"use strict";

const express = require("express");
const request = require("supertest");
const { createHealthRouter } = require("./healthRoutes");

describe("healthRoutes API", () => {
  it("returns 200 and structured checks when healthy", async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [{ ping: 1 }] }),
    };

    const mockFetch = jest.fn().mockImplementation((url) => {
      if (url.includes("horizon")) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ result: { status: "healthy" } }),
      });
    });

    const router = createHealthRouter({
      pool: mockPool,
      horizonUrl: "https://horizon.example.com",
      rpcUrl: "https://rpc.example.com",
      fetchFn: mockFetch,
    });

    const app = express();
    app.use("/health", router);

    const res = await request(app).get("/health/synthetic");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.checks.database.status).toBe("healthy");
    expect(res.body.checks.horizon.status).toBe("healthy");
    expect(res.body.checks.sorobanRpc.status).toBe("healthy");
  });

  it("returns 503 when a critical service is unhealthy", async () => {
    const mockPool = {
      query: jest.fn().mockRejectedValue(new Error("Database offline")),
    };

    const router = createHealthRouter({
      pool: mockPool,
      horizonUrl: "",
      rpcUrl: "",
    });

    const app = express();
    app.use("/health", router);

    const res = await request(app).get("/health/synthetic");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("unhealthy");
    expect(res.body.checks.database.status).toBe("unhealthy");
  });
});
