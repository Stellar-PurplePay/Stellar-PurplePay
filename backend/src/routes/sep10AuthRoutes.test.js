"use strict";

const express = require("express");
const request = require("supertest");
const StellarSdk = require("@stellar/stellar-sdk");
const jwt = require("jsonwebtoken");
const { createSep10AuthRouter } = require("./sep10AuthRoutes");
const { Sep10NonceStore } = require("../utils/sep10NonceStore");

describe("sep10AuthRoutes", () => {
  let app;
  let serverKeypair;
  let clientKeypair;
  let nonceStore;
  const networkPassphrase = StellarSdk.Networks.TESTNET;
  const homeDomain = "purplepay.app";
  const jwtSecret = "test-jwt-secret-sep10";

  beforeEach(() => {
    serverKeypair = StellarSdk.Keypair.random();
    clientKeypair = StellarSdk.Keypair.random();
    nonceStore = new Sep10NonceStore();

    const router = createSep10AuthRouter({
      serverKeypair,
      homeDomain,
      networkPassphrase,
      nonceStore,
      jwtSecret,
    });

    app = express();
    app.use(express.json());
    app.use("/api/auth/sep10", router);
  });

  it("requires valid account query param for challenge generation", async () => {
    const res1 = await request(app).get("/api/auth/sep10/challenge");
    expect(res1.status).toBe(400);

    const res2 = await request(app).get("/api/auth/sep10/challenge?account=invalidKey");
    expect(res2.status).toBe(400);
  });

  it("generates a challenge transaction signed by the server", async () => {
    const res = await request(app).get(
      `/api/auth/sep10/challenge?account=${clientKeypair.publicKey()}`
    );

    expect(res.status).toBe(200);
    expect(res.body.transaction).toBeDefined();
    expect(res.body.network_passphrase).toBe(networkPassphrase);

    // Verify it parses and has server signature
    const tx = new StellarSdk.Transaction(res.body.transaction, networkPassphrase);
    expect(tx.source).toBe(serverKeypair.publicKey());
    expect(tx.sequence).toBe("0");
    expect(tx.operations[0].source).toBe(clientKeypair.publicKey());
  });

  it("completes full SEP-0010 challenge-response authentication and returns scoped JWT", async () => {
    // 1. Request challenge
    const challengeRes = await request(app).get(
      `/api/auth/sep10/challenge?account=${clientKeypair.publicKey()}`
    );
    const challengeXdr = challengeRes.body.transaction;

    // 2. Client signs transaction envelope
    const tx = new StellarSdk.Transaction(challengeXdr, networkPassphrase);
    tx.sign(clientKeypair);
    const signedXdr = tx.toEnvelope().toXDR("base64");

    // 3. Exchange signed transaction for JWT
    const tokenRes = await request(app)
      .post("/api/auth/sep10/token")
      .send({ transaction: signedXdr });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.token).toBeDefined();
    expect(tokenRes.body.account).toBe(clientKeypair.publicKey());

    // 4. Verify decoded token claims
    const decoded = jwt.verify(tokenRes.body.token, jwtSecret);
    expect(decoded.sub).toBe(clientKeypair.publicKey());
    expect(decoded.iss).toBe(homeDomain);
    expect(decoded.auth_method).toBe("SEP-0010");

    // 5. Replay attack rejection: repeating the exact same request should fail
    const replayRes = await request(app)
      .post("/api/auth/sep10/token")
      .send({ transaction: signedXdr });

    expect(replayRes.status).toBe(400);
    expect(replayRes.body.error).toContain("replay attack detected");
  });

  it("rejects token exchange if client signature is absent", async () => {
    // Request challenge but do not sign with client
    const challengeRes = await request(app).get(
      `/api/auth/sep10/challenge?account=${clientKeypair.publicKey()}`
    );
    const unsignedXdr = challengeRes.body.transaction;

    const tokenRes = await request(app)
      .post("/api/auth/sep10/token")
      .send({ transaction: unsignedXdr });

    expect(tokenRes.status).toBe(400);
    expect(tokenRes.body.error).toContain("Missing or invalid client signature");
  });
});

