"use strict";

const {
  sep38PriceQuerySchema,
  sep38QuoteRequestSchema,
  sep38QuoteResponseSchema,
  isQuoteExpired,
} = require("./sep38Validator");

describe("sep38Validator", () => {
  describe("sep38PriceQuerySchema", () => {
    it("validates valid SEP-38 price query with sell_asset and buy_asset", () => {
      const valid = {
        sell_asset: "stellar:native",
        buy_asset: "iso4217:USD",
        sell_amount: "100.5",
        context: "sep24",
      };
      const result = sep38PriceQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects when both sell_amount and buy_amount are missing", () => {
      const invalid = {
        sell_asset: "stellar:native",
        buy_asset: "iso4217:USD",
      };
      const result = sep38PriceQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("sep38QuoteResponseSchema and isQuoteExpired", () => {
    it("validates quote response schema and detects active quote", () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();
      const quote = {
        id: "quote-12345",
        expires_at: futureTime,
        total_price: "0.125",
        price: "0.125",
        sell_asset: "stellar:native",
        sell_amount: "1000",
        buy_asset: "iso4217:USD",
        buy_amount: "125",
      };

      const result = sep38QuoteResponseSchema.safeParse(quote);
      expect(result.success).toBe(true);
      expect(isQuoteExpired(quote)).toBe(false);
    });

    it("detects expired quote", () => {
      const pastTime = new Date(Date.now() - 5000).toISOString();
      const expiredQuote = { expires_at: pastTime };
      expect(isQuoteExpired(expiredQuote)).toBe(true);
    });
  });
});
