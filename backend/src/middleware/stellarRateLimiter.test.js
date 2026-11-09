"use strict";

const express = require("express");
const request = require("supertest");
const {
  createStellarRateLimiter,
  MemorySlidingWindowStore,
} = require("./stellarRateLimiter");

describe("StellarRateLimiter Middleware", () => {
  let store;
  let app;

  beforeEach(() => {
    store = new MemorySlidingWindowStore();
    app = express();

    const limiter = createStellarRateLimiter({
      windowMs: 1000, // 1 second window for test
      ipLimit: 3,
      walletLimit: 6,
      burstAllowance: 1,
      store,
    });

    app.use(limiter);
    app.get("/api/test-stellar", (req, res) => {
      res.json({ ok: true });
    });
  });

  it("permits requests within quota and adds rate limit headers", async () => {
    const res = await request(app).get("/api/test-stellar");

    expect(res.status).toBe(200);
    expect(res.headers["x-ratelimit-limit"]).toBe("4"); // 3 + 1 burst
    expect(res.headers["x-ratelimit-remaining"]).toBe("3");
  });

  it("returns 429 STELLAR_RATE_LIMITED when anonymous IP exceeds quota", async () => {
    // 4 requests allowed (3 + 1 burst)
    for (let i = 0; i < 4; i++) {
      const res = await request(app).get("/api/test-stellar");
      expect(res.status).toBe(200);
    }

    // 5th request blocked
    const resBlocked = await request(app).get("/api/test-stellar");
    expect(resBlocked.status).toBe(429);
    expect(resBlocked.body.code).toBe("STELLAR_RATE_LIMITED");
    expect(resBlocked.headers["retry-after"]).toBeDefined();
  });

  it("grants higher quota to authenticated wallet", async () => {
    const walletHeader = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734";

    // Wallet limit is 6 + 1 burst = 7
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .get("/api/test-stellar")
        .set("x-stellar-wallet", walletHeader);
      expect(res.status).toBe(200);
      expect(res.headers["x-ratelimit-limit"]).toBe("7");
    }

    // 8th request blocked
    const resBlocked = await request(app)
      .get("/api/test-stellar")
      .set("x-stellar-wallet", walletHeader);
    expect(resBlocked.status).toBe(429);
    expect(resBlocked.body.code).toBe("STELLAR_RATE_LIMITED");
  });

  it("slides window and restores quota after time elapses", async () => {
    // Fill quota
    for (let i = 0; i < 4; i++) {
      await request(app).get("/api/test-stellar");
    }

    const blocked = await request(app).get("/api/test-stellar");
    expect(blocked.status).toBe(429);

    // Wait for 1 second window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Request allowed again
    const restored = await request(app).get("/api/test-stellar");
    expect(restored.status).toBe(200);
  });
});
