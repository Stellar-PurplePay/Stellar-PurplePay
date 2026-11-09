"use strict";

const express = require("express");
const request = require("supertest");
const {
  SorobanCircuitBreaker,
  createSorobanCircuitMiddleware,
} = require("./sorobanCircuitBreaker");

describe("SorobanCircuitBreaker Middleware", () => {
  let breaker;
  let app;
  let upstreamStatus = 200;

  beforeEach(() => {
    breaker = new SorobanCircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 500, // 500ms for fast test
      halfOpenProbeCount: 2,
    });

    app = express();
    app.use(createSorobanCircuitMiddleware({ breaker }));
    app.get("/api/test-soroban", (req, res) => {
      res.status(upstreamStatus).json({ status: upstreamStatus });
    });
  });

  it("passes requests normally when CLOSED", async () => {
    upstreamStatus = 200;
    const res = await request(app).get("/api/test-soroban");
    expect(res.status).toBe(200);
    expect(breaker.getState()).toBe("CLOSED");
  });

  it("trips to OPEN after consecutive 502/503 responses", async () => {
    upstreamStatus = 502;

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/api/test-soroban");
      expect(res.status).toBe(502);
    }

    expect(breaker.getState()).toBe("OPEN");

    // Next request is intercepted by circuit breaker with 503
    const resBlocked = await request(app).get("/api/test-soroban");
    expect(resBlocked.status).toBe(503);
    expect(resBlocked.body.code).toBe("STELLAR_CIRCUIT_OPEN");
    expect(resBlocked.headers["retry-after"]).toBe("1");
  });

  it("recovers from OPEN to HALF_OPEN and then CLOSED on probe success", async () => {
    breaker.state = "OPEN";
    breaker.lastFailureTime = Date.now();

    // Verify fast-fail while OPEN
    const resBefore = await request(app).get("/api/test-soroban");
    expect(resBefore.status).toBe(503);

    // Wait past reset timeout
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect(breaker.getState()).toBe("HALF_OPEN");

    upstreamStatus = 200;

    // Probe 1
    const probe1 = await request(app).get("/api/test-soroban");
    expect(probe1.status).toBe(200);
    expect(breaker.getState()).toBe("HALF_OPEN");

    // Probe 2 restores CLOSED
    const probe2 = await request(app).get("/api/test-soroban");
    expect(probe2.status).toBe(200);
    expect(breaker.getState()).toBe("CLOSED");
  });
});
