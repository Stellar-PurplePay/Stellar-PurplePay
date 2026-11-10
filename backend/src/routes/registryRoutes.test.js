const request = require("supertest");
const express = require("express");
const registryRoutes = require("./registryRoutes");

describe("Registry Routes (/api/registry)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use("/api/registry", registryRoutes);
  });

  it("GET /api/registry should return default testnet contract configuration", async () => {
    const res = await request(app).get("/api/registry");
    expect(res.status).toBe(200);
    expect(res.body.network).toBe("testnet");
    expect(res.body.escrowContractId).toMatch(/^C[A-Z2-7]{55}$/);
    expect(res.body.usdcTokenId).toMatch(/^C[A-Z2-7]{55}$/);
    expect(res.body.networkPassphrase).toContain("Test SDF Network");
  });

  it("GET /api/registry?network=public should return mainnet contract configuration", async () => {
    const res = await request(app).get("/api/registry?network=public");
    expect(res.status).toBe(200);
    expect(res.body.network).toBe("public");
    expect(res.body.networkPassphrase).toContain("Public Global Stellar Network");
  });
});

