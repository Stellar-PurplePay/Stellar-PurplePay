"use strict";

const axios = require("axios");

/**
 * Health check monitor for Stellar Horizon and Soroban RPC endpoints.
 */
class StellarRpcHealthCheck {
  constructor(options = {}) {
    this.sorobanRpcUrl =
      options.sorobanRpcUrl ||
      process.env.SOROBAN_RPC_URL ||
      "https://soroban-testnet.stellar.org";
    this.horizonUrl =
      options.horizonUrl ||
      process.env.STELLAR_HORIZON_URL ||
      "https://horizon-testnet.stellar.org";
    this.timeoutMs = options.timeoutMs || 4000;
  }

  /**
   * Probes the Soroban RPC endpoint for health and latest ledger sequence.
   *
   * @param {object} [httpClient] - Optional injectable HTTP client
   * @returns {Promise<object>}
   */
  async checkSorobanRpcHealth(httpClient = axios) {
    const start = Date.now();
    try {
      const res = await httpClient.post(
        this.sorobanRpcUrl,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "getLatestLedger",
          params: {},
        },
        { timeout: this.timeoutMs }
      );

      const latencyMs = Date.now() - start;
      const data = res.data;

      if (data.error) {
        return {
          status: "unhealthy",
          url: this.sorobanRpcUrl,
          latencyMs,
          error: data.error.message || "RPC returned error",
        };
      }

      const sequence = data.result?.sequence;
      return {
        status: latencyMs > 2500 ? "degraded" : "healthy",
        url: this.sorobanRpcUrl,
        latencyMs,
        latestLedger: sequence,
      };
    } catch (err) {
      return {
        status: "unhealthy",
        url: this.sorobanRpcUrl,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Probes the Horizon endpoint for root info and ledger sequence.
   *
   * @param {object} [httpClient] - Optional injectable HTTP client
   * @returns {Promise<object>}
   */
  async checkHorizonHealth(httpClient = axios) {
    const start = Date.now();
    try {
      const res = await httpClient.get(this.horizonUrl, { timeout: this.timeoutMs });
      const latencyMs = Date.now() - start;
      const data = res.data;

      const coreLatestLedger = data.core_latest_ledger || data.history_latest_ledger;
      const networkPassphrase = data.network_passphrase;

      return {
        status: latencyMs > 2500 ? "degraded" : "healthy",
        url: this.horizonUrl,
        latencyMs,
        coreLatestLedger,
        networkPassphrase,
      };
    } catch (err) {
      return {
        status: "unhealthy",
        url: this.horizonUrl,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Performs composite health probe across both nodes.
   *
   * @param {object} [httpClient]
   * @returns {Promise<object>}
   */
  async getCombinedHealth(httpClient = axios) {
    const [soroban, horizon] = await Promise.all([
      this.checkSorobanRpcHealth(httpClient),
      this.checkHorizonHealth(httpClient),
    ]);

    let overallStatus = "healthy";
    if (soroban.status === "unhealthy" || horizon.status === "unhealthy") {
      overallStatus = "unhealthy";
    } else if (soroban.status === "degraded" || horizon.status === "degraded") {
      overallStatus = "degraded";
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      sorobanRpc: soroban,
      horizon,
    };
  }
}

module.exports = new StellarRpcHealthCheck();
module.exports.StellarRpcHealthCheck = StellarRpcHealthCheck;
