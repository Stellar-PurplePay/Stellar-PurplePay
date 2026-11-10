"use strict";

const DEFAULT_TIMEOUT_MS = 2500;

/**
 * Executes a promise with an enforced timeout.
 */
function withTimeout(promise, timeoutMs = DEFAULT_TIMEOUT_MS, operationName = "Operation") {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs);
    if (timer.unref) timer.unref();
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Check Database health via ping query.
 */
async function checkDatabaseHealth(pool) {
  const t0 = Date.now();
  if (!pool || typeof pool.query !== "function") {
    return {
      status: "skipped",
      message: "Database pool not configured or mocked",
      latencyMs: 0,
    };
  }

  try {
    await withTimeout(pool.query("SELECT 1 AS ping"), DEFAULT_TIMEOUT_MS, "Database ping");
    return {
      status: "healthy",
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    return {
      status: "unhealthy",
      error: err.message,
      latencyMs: Date.now() - t0,
    };
  }
}

/**
 * Check Horizon health endpoint.
 */
async function checkHorizonHealth(horizonUrl, fetchFn = globalThis.fetch) {
  const t0 = Date.now();
  if (!horizonUrl) {
    return {
      status: "skipped",
      message: "Horizon URL not configured",
      latencyMs: 0,
    };
  }

  try {
    const res = await withTimeout(
      fetchFn(horizonUrl, { method: "GET", headers: { Accept: "application/json" } }),
      DEFAULT_TIMEOUT_MS,
      "Horizon health check"
    );

    const latencyMs = Date.now() - t0;
    if (res.ok) {
      return { status: "healthy", latencyMs };
    }
    return {
      status: "degraded",
      statusCode: res.status,
      latencyMs,
      error: `Horizon returned HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      status: "unhealthy",
      error: err.message,
      latencyMs: Date.now() - t0,
    };
  }
}

/**
 * Check Soroban RPC health via getHealth RPC method.
 */
async function checkSorobanRpcHealth(rpcUrl, fetchFn = globalThis.fetch) {
  const t0 = Date.now();
  if (!rpcUrl) {
    return {
      status: "skipped",
      message: "Soroban RPC URL not configured",
      latencyMs: 0,
    };
  }

  try {
    const res = await withTimeout(
      fetchFn(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getHealth",
        }),
      }),
      DEFAULT_TIMEOUT_MS,
      "Soroban RPC getHealth"
    );

    const latencyMs = Date.now() - t0;
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      const rpcStatus = body?.result?.status === "healthy" ? "healthy" : "degraded";
      return { status: rpcStatus, latencyMs, details: body?.result };
    }
    return {
      status: "degraded",
      statusCode: res.status,
      latencyMs,
      error: `Soroban RPC returned HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      status: "unhealthy",
      error: err.message,
      latencyMs: Date.now() - t0,
    };
  }
}

/**
 * Runs comprehensive synthetic health probe against all subsystems.
 */
async function runSyntheticHealthCheck(options = {}) {
  const {
    pool = null,
    horizonUrl = process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
    rpcUrl = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
    fetchFn = globalThis.fetch,
  } = options;

  const [dbResult, horizonResult, rpcResult] = await Promise.all([
    checkDatabaseHealth(pool),
    checkHorizonHealth(horizonUrl, fetchFn),
    checkSorobanRpcHealth(rpcUrl, fetchFn),
  ]);

  const checks = {
    database: dbResult,
    horizon: horizonResult,
    sorobanRpc: rpcResult,
  };

  let overallStatus = "healthy";

  const hasUnhealthy = Object.values(checks).some((c) => c.status === "unhealthy");
  const hasDegraded = Object.values(checks).some(
    (c) => c.status === "degraded" || (c.latencyMs && c.latencyMs > 1500)
  );

  if (hasUnhealthy) {
    overallStatus = "unhealthy";
  } else if (hasDegraded) {
    overallStatus = "degraded";
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };
}

module.exports = {
  runSyntheticHealthCheck,
  checkDatabaseHealth,
  checkHorizonHealth,
  checkSorobanRpcHealth,
};
