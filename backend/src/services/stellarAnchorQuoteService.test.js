"use strict";

const { StellarAnchorQuoteService } = require("./stellarAnchorQuoteService");

describe("stellarAnchorQuoteService", () => {
  let service;
  const mockAnchorUrl = "https://anchor.example.com/sep38";
  const mockJwt = "mock.jwt.token";

  beforeEach(() => {
    service = new StellarAnchorQuoteService({ cacheTtlMs: 10_000 });
  });

  it("fetches and caches indicative prices", async () => {
    const mockHttpClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          total_price: "1.005",
          price: "1.00",
          sell_amount: "100",
          buy_amount: "99.5",
        },
      }),
    };

    const params = {
      sell_asset: "iso4217:USD",
      buy_asset: "stellar:native",
      sell_amount: "100",
      context: "sep24",
    };

    // First call: executes HTTP request
    const price1 = await service.getIndicativePrice(mockAnchorUrl, params, mockHttpClient);
    expect(price1.total_price).toBe("1.005");
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

    // Second call: serves from cache
    const price2 = await service.getIndicativePrice(mockAnchorUrl, params, mockHttpClient);
    expect(price2.total_price).toBe("1.005");
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
  });

  it("requests a valid firm quote with Bearer JWT", async () => {
    const validExpiry = new Date(Date.now() + 60_000).toISOString();
    const mockQuoteResponse = {
      id: "quote-xyz-123",
      expires_at: validExpiry,
      total_price: "1.002",
      price: "1.00",
      sell_asset: "iso4217:USD",
      sell_amount: "500",
      buy_asset: "stellar:native",
      buy_amount: "499",
    };

    const mockHttpClient = {
      post: jest.fn().mockResolvedValue({ data: mockQuoteResponse }),
    };

    const quote = await service.requestFirmQuote(
      mockAnchorUrl,
      {
        context: "sep24",
        sell_asset: "iso4217:USD",
        buy_asset: "stellar:native",
        sell_amount: "500",
      },
      mockJwt,
      mockHttpClient
    );

    expect(quote.id).toBe("quote-xyz-123");
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      "https://anchor.example.com/sep38/quote",
      expect.objectContaining({ sell_amount: "500" }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${mockJwt}` }),
      })
    );
  });

  it("throws error when attempting to request firm quote without JWT", async () => {
    await expect(
      service.requestFirmQuote(mockAnchorUrl, { context: "sep24" }, null)
    ).rejects.toThrow("JWT authorization token is required");
  });
});
