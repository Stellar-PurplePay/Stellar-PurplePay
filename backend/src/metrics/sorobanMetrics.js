"use strict";

const promClient = require("prom-client");

// Separate registry for isolated Soroban RPC Prometheus metrics
const sorobanRegistry = new promClient.Registry();

const rpcRequestsCounter = new promClient.Counter({
  name: "soroban_rpc_requests_total",
  help: "Total count of Soroban RPC calls made by method, status, and error code",
  labelNames: ["method", "status", "error_code"],
  registers: [sorobanRegistry],
});

const rpcDurationHistogram = new promClient.Histogram({
  name: "soroban_rpc_duration_seconds",
  help: "Latency of Soroban RPC calls in seconds",
  labelNames: ["method"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [sorobanRegistry],
});

const cpuInstructionsCounter = new promClient.Counter({
  name: "soroban_tx_cpu_instructions_total",
  help: "Cumulative CPU instructions consumed by Soroban contract executions",
  labelNames: ["operation"],
  registers: [sorobanRegistry],
});

const memoryBytesCounter = new promClient.Counter({
  name: "soroban_tx_memory_bytes_total",
  help: "Cumulative memory bytes consumed by Soroban contract executions",
  labelNames: ["operation"],
  registers: [sorobanRegistry],
});

const feeStroopsCounter = new promClient.Counter({
  name: "soroban_tx_fee_stroops_total",
  help: "Cumulative fees in stroops paid for Soroban transactions",
  labelNames: ["operation"],
  registers: [sorobanRegistry],
});

/**
 * Record an executed Soroban RPC method invocation.
 *
 * @param {string} method - e.g. "simulateTransaction", "sendTransaction", "getEvents"
 * @param {number} durationSeconds - duration in seconds
 * @param {"success"|"error"} status
 * @param {string} [errorCode="none"]
 */
function recordRpcCall(method, durationSeconds, status = "success", errorCode = "none") {
  const cleanMethod = method || "unknown";
  const cleanStatus = status === "error" ? "error" : "success";
  const cleanCode = String(errorCode || "none");

  rpcRequestsCounter.inc({
    method: cleanMethod,
    status: cleanStatus,
    error_code: cleanCode,
  });

  if (typeof durationSeconds === "number" && durationSeconds >= 0) {
    rpcDurationHistogram.observe({ method: cleanMethod }, durationSeconds);
  }
}

/**
 * Record resource consumption metrics for a simulated/submitted Soroban transaction.
 *
 * @param {string} operation - e.g. "create_escrow", "release_milestone", "resolve_dispute"
 * @param {object} resources
 * @param {number} [resources.cpuInstructions=0]
 * @param {number} [resources.memoryBytes=0]
 * @param {number} [resources.feeStroops=0]
 */
function recordSorobanResources(operation, resources = {}) {
  const cleanOp = operation || "generic";
  const cpu = Number(resources.cpuInstructions) || 0;
  const mem = Number(resources.memoryBytes) || 0;
  const fee = Number(resources.feeStroops) || 0;

  if (cpu > 0) cpuInstructionsCounter.inc({ operation: cleanOp }, cpu);
  if (mem > 0) memoryBytesCounter.inc({ operation: cleanOp }, mem);
  if (fee > 0) feeStroopsCounter.inc({ operation: cleanOp }, fee);
}

/**
 * Returns formatted Prometheus exposition text for all Soroban metrics.
 */
async function getMetricsAsText() {
  return sorobanRegistry.metrics();
}

/**
 * Reset all metrics counters (for testing).
 */
function resetMetrics() {
  sorobanRegistry.resetMetrics();
}

module.exports = {
  sorobanRegistry,
  rpcRequestsCounter,
  rpcDurationHistogram,
  cpuInstructionsCounter,
  memoryBytesCounter,
  feeStroopsCounter,
  recordRpcCall,
  recordSorobanResources,
  getMetricsAsText,
  resetMetrics,
};

