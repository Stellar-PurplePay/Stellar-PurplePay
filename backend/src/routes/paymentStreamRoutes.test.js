"use strict";

const express = require("express");
const request = require("supertest");
const paymentStreamRoutes = require("./paymentStreamRoutes");
const StellarPaymentStreamer = require("../services/stellarPaymentStreamer");

jest.mock("../services/stellarPaymentStreamer");

describe("paymentStreamRoutes", () => {
  let app;
  const validAddress = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  beforeEach(() => {
    app = express();
    app.use("/api/stellar/stream", paymentStreamRoutes);
    jest.clearAllMocks();
  });

  it("returns 400 for invalid address", async () => {
    const res = await request(app).get("/api/stellar/stream/payments/bad_address");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid Stellar account address");
  });

  it("sets up SSE stream and returns connection acknowledgement", async () => {
    const mockClose = jest.fn();
    StellarPaymentStreamer.prototype.subscribeAccountPayments.mockReturnValue({
      close: mockClose,
      getStatus: () => "connected",
      isSeen: () => false,
    });

    const res = await request(app)
      .get(`/api/stellar/stream/payments/${validAddress}`)
      .buffer(true)
      .parse((res, callback) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk.toString();
          // Terminate after receiving connection event
          res.destroy();
          callback(null, data);
        });
      });

    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.body).toContain("event: connected");
    expect(res.body).toContain(validAddress);
  });
});
