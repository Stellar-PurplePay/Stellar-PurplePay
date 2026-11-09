"use strict";

const StellarPaymentStreamer = require("./stellarPaymentStreamer");

describe("StellarPaymentStreamer", () => {
  const validAddress = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("throws error for invalid Stellar address", () => {
    const streamer = new StellarPaymentStreamer();
    expect(() => {
      streamer.subscribeAccountPayments("invalid_address", jest.fn());
    }).toThrow("Invalid Stellar address");
  });

  it("throws error when onPayment callback is not a function", () => {
    const streamer = new StellarPaymentStreamer();
    expect(() => {
      streamer.subscribeAccountPayments(validAddress, null);
    }).toThrow("onPayment callback must be a function");
  });

  it("subscribes and processes payment records", () => {
    let capturedStreamOptions = null;
    const mockClose = jest.fn();

    const mockPayments = {
      forAccount: jest.fn().mockReturnThis(),
      cursor: jest.fn().mockReturnThis(),
      stream: jest.fn((options) => {
        capturedStreamOptions = options;
        return mockClose;
      }),
    };

    const mockServer = {
      payments: jest.fn(() => mockPayments),
    };

    const streamer = new StellarPaymentStreamer({ server: mockServer });
    const paymentHandler = jest.fn();
    const errorHandler = jest.fn();

    const subscription = streamer.subscribeAccountPayments(validAddress, paymentHandler, {
      cursor: "100",
      onError: errorHandler,
    });

    expect(mockPayments.forAccount).toHaveBeenCalledWith(validAddress);
    expect(mockPayments.cursor).toHaveBeenCalledWith("100");
    expect(subscription.getStatus()).toBe("connecting");

    // Simulate incoming payment record
    const dummyRecord = {
      id: "pay_1",
      type: "payment",
      from: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      to: validAddress,
      amount: "100.5000000",
      asset_code: "USDC",
      asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      transaction_hash: "tx_hash_123",
      created_at: "2026-11-09T20:00:00Z",
      paging_token: "pt_1",
    };

    capturedStreamOptions.onmessage(dummyRecord);

    expect(paymentHandler).toHaveBeenCalledTimes(1);
    expect(paymentHandler).toHaveBeenCalledWith({
      id: "pay_1",
      type: "payment",
      from: dummyRecord.from,
      to: validAddress,
      amount: "100.5000000",
      asset: "USDC",
      assetIssuer: dummyRecord.asset_issuer,
      txHash: "tx_hash_123",
      createdAt: "2026-11-09T20:00:00Z",
      pagingToken: "pt_1",
    });

    expect(subscription.getStatus()).toBe("connected");
    expect(subscription.isSeen("pay_1")).toBe(true);

    // Duplicate message delivery is ignored
    capturedStreamOptions.onmessage(dummyRecord);
    expect(paymentHandler).toHaveBeenCalledTimes(1);

    // Close subscription
    subscription.close();
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(subscription.getStatus()).toBe("closed");
  });

  it("forwards errors to onError callback", () => {
    let capturedStreamOptions = null;
    const mockPayments = {
      forAccount: jest.fn().mockReturnThis(),
      cursor: jest.fn().mockReturnThis(),
      stream: jest.fn((options) => {
        capturedStreamOptions = options;
        return jest.fn();
      }),
    };
    const mockServer = { payments: jest.fn(() => mockPayments) };

    const streamer = new StellarPaymentStreamer({ server: mockServer });
    const errorHandler = jest.fn();

    const subscription = streamer.subscribeAccountPayments(validAddress, jest.fn(), {
      onError: errorHandler,
    });

    const streamError = new Error("Network timeout");
    capturedStreamOptions.onerror(streamError);

    expect(errorHandler).toHaveBeenCalledWith(streamError);
    expect(subscription.getStatus()).toBe("error");
  });
});
