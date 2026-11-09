"use strict";

const { z } = require("zod");

const sep38AssetSchema = z
  .string()
  .regex(
    /^(stellar:[a-zA-Z0-9]+(:[a-zA-Z0-9]+)?|iso4217:[a-zA-Z]{3})$/,
    "Asset must follow SEP-38 format, e.g. stellar:native, stellar:USDC:G..., or iso4217:USD"
  );

const sep38PriceQuerySchema = z.object({
  sell_asset: sep38AssetSchema,
  buy_asset: sep38AssetSchema,
  sell_amount: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  buy_amount: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  context: z.enum(["sep6", "sep24", "sep31"]).optional(),
}).refine((data) => data.sell_amount || data.buy_amount, {
  message: "Either sell_amount or buy_amount must be provided",
});

const sep38QuoteRequestSchema = z.object({
  context: z.enum(["sep6", "sep24", "sep31"]),
  sell_asset: sep38AssetSchema,
  buy_asset: sep38AssetSchema,
  sell_amount: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  buy_amount: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  expire_after: z.string().datetime().optional(),
}).refine((data) => data.sell_amount || data.buy_amount, {
  message: "Either sell_amount or buy_amount must be provided",
});

const sep38QuoteResponseSchema = z.object({
  id: z.string().min(1),
  expires_at: z.string().datetime(),
  total_price: z.string(),
  price: z.string(),
  sell_asset: sep38AssetSchema,
  sell_amount: z.string(),
  buy_asset: sep38AssetSchema,
  buy_amount: z.string(),
  fee: z.object({
    total: z.string(),
    asset: sep38AssetSchema,
  }).optional(),
});

/**
 * Checks whether an anchor quote has expired based on expires_at timestamp.
 * @param {object} quote
 * @param {number} [toleranceSeconds=5]
 * @returns {boolean} True if expired
 */
function isQuoteExpired(quote, toleranceSeconds = 5) {
  if (!quote || !quote.expires_at) return true;
  const expiryTime = new Date(quote.expires_at).getTime();
  if (isNaN(expiryTime)) return true;
  return Date.now() + toleranceSeconds * 1000 >= expiryTime;
}

module.exports = {
  sep38AssetSchema,
  sep38PriceQuerySchema,
  sep38QuoteRequestSchema,
  sep38QuoteResponseSchema,
  isQuoteExpired,
};
