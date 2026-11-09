"use strict";

const axios = require("axios");
const {
  sep38PriceQuerySchema,
  sep38QuoteRequestSchema,
  sep38QuoteResponseSchema,
  isQuoteExpired,
} = require("../validators/sep38Validator");

class StellarAnchorQuoteService {
  constructor(options = {}) {
    this.cacheTtlMs = options.cacheTtlMs || 30_000;
    this.priceCache = new Map();
  }

  /**
   * Fetches indicative prices for an asset pair from an anchor's SEP-38 endpoint.
   *
   * @param {string} anchorBaseUrl - Base URL of the anchor
   * @param {object} params - { sell_asset, buy_asset, sell_amount, buy_amount, context }
   * @param {object} [httpClient] - Optional axios client for mocking
   * @returns {Promise<object>} Price response payload
   */
  async getIndicativePrice(anchorBaseUrl, params, httpClient = axios) {
    const validated = sep38PriceQuerySchema.parse(params);
    const cacheKey = `${anchorBaseUrl}:${validated.sell_asset}:${validated.buy_asset}:${
      validated.sell_amount || ""
    }:${validated.buy_amount || ""}`;

    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    const endpoint = `${anchorBaseUrl.replace(/\/+$/, "")}/price`;
    const res = await httpClient.get(endpoint, {
      params: validated,
      timeout: 5000,
    });

    const data = res.data;
    this.priceCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  /**
   * Requests a binding firm quote from anchor's POST /quote endpoint (requires SEP-10 JWT).
   *
   * @param {string} anchorBaseUrl - Base URL of the anchor
   * @param {object} quoteParams - Quote request params
   * @param {string} jwtToken - SEP-0010 authentication JWT
   * @param {object} [httpClient] - Optional axios client
   * @returns {Promise<object>} Validated Quote Response
   */
  async requestFirmQuote(anchorBaseUrl, quoteParams, jwtToken, httpClient = axios) {
    if (!jwtToken) {
      throw new Error("JWT authorization token is required to request a firm quote under SEP-0038");
    }

    const validatedRequest = sep38QuoteRequestSchema.parse(quoteParams);
    const endpoint = `${anchorBaseUrl.replace(/\/+$/, "")}/quote`;

    const res = await httpClient.post(endpoint, validatedRequest, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
      timeout: 8000,
    });

    const parsedQuote = sep38QuoteResponseSchema.parse(res.data);

    if (isQuoteExpired(parsedQuote, 0)) {
      throw new Error(`Anchor returned an already-expired quote: ${parsedQuote.id}`);
    }

    return parsedQuote;
  }

  /**
   * Retrieves an existing firm quote from GET /quote/:id.
   *
   * @param {string} anchorBaseUrl
   * @param {string} quoteId
   * @param {string} jwtToken
   * @param {object} [httpClient]
   */
  async getFirmQuote(anchorBaseUrl, quoteId, jwtToken, httpClient = axios) {
    if (!jwtToken) {
      throw new Error("JWT authorization token is required to fetch a firm quote");
    }
    if (!quoteId) {
      throw new Error("quoteId is required");
    }

    const endpoint = `${anchorBaseUrl.replace(/\/+$/, "")}/quote/${encodeURIComponent(quoteId)}`;
    const res = await httpClient.get(endpoint, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
      timeout: 5000,
    });

    return sep38QuoteResponseSchema.parse(res.data);
  }

  /**
   * Clears internal price cache.
   */
  clearCache() {
    this.priceCache.clear();
  }
}

module.exports = new StellarAnchorQuoteService();
module.exports.StellarAnchorQuoteService = StellarAnchorQuoteService;
