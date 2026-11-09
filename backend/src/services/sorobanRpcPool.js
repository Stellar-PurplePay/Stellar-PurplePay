"use strict";

const { SorobanRpc } = require("@stellar/stellar-sdk");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("sorobanRpcPool");

class RpcPoolExhaustedError extends Error {
  constructor(message) {
    super(message);
    this.name = "RpcPoolExhaustedError";
  }
}

class SorobanRpcPool {
  /**
   * @param {string[]} endpoints - Array of RPC URL strings in priority order
   * @param {object} [options]
   * @param {number} [options.healthCheckTimeoutMs=3000]
   */
  constructor(endpoints = [], options = {}) {
    const rawList =
      endpoints.length > 0
        ? endpoints
        : (process.env.SOROBAN_RPC_URLS || process.env.SOROBAN_RPC_URL || "https://rpc-testnet.stellar.org")
            .split(",")
            .map((u) => u.trim())
            .filter(Boolean);

    this.healthCheckTimeoutMs = options.healthCheckTimeoutMs || 3000;
    this.nodes = rawList.map((url) => ({
      url,
      healthy: true,
      lastCheckedAt: null,
      consecutiveFailures: 0,
      latencyMs: null,
      server: new SorobanRpc.Server(url, {
        allowHttp: url.startsWith("http://"),
      }),
    }));
  }

  /**
   * Returns the primary healthy Server instance.
   * @returns {SorobanRpc.Server}
   */
  getActiveServer() {
    const healthyNode = this.nodes.find((n) => n.healthy);
    if (!healthyNode) {
      logger.error("All Soroban RPC nodes are currently marked unhealthy; falling back to primary");
      return this.nodes[0]?.server;
    }
    return healthyNode.server;
  }

  /**
   * Returns current health stats for all nodes.
   */
  getStatus() {
    return this.nodes.map((n) => ({
      url: n.url,
      healthy: n.healthy,
      consecutiveFailures: n.consecutiveFailures,
      latencyMs: n.latencyMs,
      lastCheckedAt: n.lastCheckedAt,
    }));
  }

  /**
   * Probes an individual node's health and updates its status.
   * @param {object} node
   */
  async probeNode(node) {
    const start = Date.now();
    let timerId = null;
    try {
      const probePromise = node.server.getLatestLedger();
      const timeoutPromise = new Promise((_, reject) => {
        timerId = setTimeout(() => reject(new Error("RPC health check timeout")), this.healthCheckTimeoutMs);
      });

      await Promise.race([probePromise, timeoutPromise]);
      if (timerId) clearTimeout(timerId);
      node.latencyMs = Date.now() - start;
      node.healthy = true;
      node.consecutiveFailures = 0;
      node.lastCheckedAt = new Date().toISOString();
      return true;
    } catch (err) {
      if (timerId) clearTimeout(timerId);
      node.latencyMs = null;
      node.consecutiveFailures += 1;
      node.healthy = false;
      node.lastCheckedAt = new Date().toISOString();
      logger.warn(
        { url: node.url, error: err.message, failures: node.consecutiveFailures },
        "Soroban RPC node health probe failed"
      );
      return false;
    }
  }

  /**
   * Probes all nodes in the pool.
   */
  async probeAll() {
    return Promise.all(this.nodes.map((node) => this.probeNode(node)));
  }

  /**
   * Executes an RPC operation, automatically rotating to the next node if the current one throws a network or server error.
   * @param {Function} operation - (server: SorobanRpc.Server) => Promise<any>
   */
  async executeWithFailover(operation) {
    let lastError = null;

    for (const node of this.nodes) {
      if (!node.healthy && this.nodes.some((n) => n.healthy)) {
        continue;
      }
      try {
        const result = await operation(node.server);
        node.healthy = true;
        node.consecutiveFailures = 0;
        return result;
      } catch (err) {
        lastError = err;
        node.consecutiveFailures += 1;
        node.healthy = false;
        logger.warn(
          { url: node.url, error: err.message },
          "Soroban RPC node operation failed; rotating to next node in pool"
        );
      }
    }

    throw new RpcPoolExhaustedError(
      `All ${this.nodes.length} Soroban RPC nodes in pool failed: ${lastError?.message}`
    );
  }
}

module.exports = {
  SorobanRpcPool,
  RpcPoolExhaustedError,
};
