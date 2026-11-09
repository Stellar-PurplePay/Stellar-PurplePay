"use strict";

const { SorobanRpc } = require("@stellar/stellar-sdk");

const MAX_SOROBAN_CPU_INSTRUCTIONS = 100000000; // Protocol limit ~100M instructions
const MAX_SOROBAN_MEMORY_BYTES = 41943040; // Protocol limit ~40MB RAM
const BUDGET_WARNING_THRESHOLD_PERCENT = 0.8; // 80%

class SimulationAnalysisError extends Error {
  constructor(message, code = "SIMULATION_ANALYSIS_ERROR") {
    super(message);
    this.name = "SimulationAnalysisError";
    this.code = code;
  }
}

/**
 * Analyzes a Soroban simulateTransaction response and returns structured diagnostics.
 *
 * @param {SorobanRpc.Api.SimulateTransactionResponse} simulationResult
 * @returns {object} Diagnostic report
 */
function analyzeSimulationResult(simulationResult) {
  if (!simulationResult) {
    throw new SimulationAnalysisError("Missing simulation result", "EMPTY_RESULT");
  }

  // Check if simulation resulted in an error
  if (SorobanRpc.Api.isSimulationError(simulationResult) || simulationResult.error) {
    return {
      success: false,
      error: simulationResult.error || "Simulation error",
      events: simulationResult.events || [],
      cpuConsumed: 0,
      memoryConsumed: 0,
      minResourceFee: "0",
      warnings: ["Contract simulation failed execution"],
      requiredSigners: [],
    };
  }

  const cost = simulationResult.cost || {};
  const cpuConsumed = parseInt(cost.cpuInsns || "0", 10);
  const memoryConsumed = parseInt(cost.memBytes || "0", 10);
  const minResourceFee = String(simulationResult.minResourceFee || "0");

  const cpuUsagePercent = cpuConsumed / MAX_SOROBAN_CPU_INSTRUCTIONS;
  const memoryUsagePercent = memoryConsumed / MAX_SOROBAN_MEMORY_BYTES;

  const warnings = [];
  if (cpuUsagePercent >= BUDGET_WARNING_THRESHOLD_PERCENT) {
    warnings.push(
      `CPU instructions (${cpuConsumed}) exceed ${(BUDGET_WARNING_THRESHOLD_PERCENT * 100).toFixed(0)}% of Soroban budget limit`
    );
  }
  if (memoryUsagePercent >= BUDGET_WARNING_THRESHOLD_PERCENT) {
    warnings.push(
      `Memory bytes (${memoryConsumed}) exceed ${(BUDGET_WARNING_THRESHOLD_PERCENT * 100).toFixed(0)}% of Soroban budget limit`
    );
  }

  // Extract required signers from results[].auth
  const requiredSigners = new Set();
  const results = simulationResult.results || [];
  for (const res of results) {
    const authEntries = res.auth || [];
    for (const auth of authEntries) {
      if (auth.credentials && typeof auth.credentials.address === "function") {
        requiredSigners.add(auth.credentials.address());
      } else if (auth.credentials?.address) {
        requiredSigners.add(String(auth.credentials.address));
      }
    }
  }

  return {
    success: true,
    error: null,
    cpuConsumed,
    cpuUsagePercent: Math.round(cpuUsagePercent * 1000) / 10,
    memoryConsumed,
    memoryUsagePercent: Math.round(memoryUsagePercent * 1000) / 10,
    minResourceFee,
    transactionData: simulationResult.transactionData || null,
    eventsCount: (simulationResult.events || []).length,
    requiredSigners: Array.from(requiredSigners),
    warnings,
  };
}

module.exports = {
  analyzeSimulationResult,
  MAX_SOROBAN_CPU_INSTRUCTIONS,
  MAX_SOROBAN_MEMORY_BYTES,
  SimulationAnalysisError,
};
