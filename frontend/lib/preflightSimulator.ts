/**
 * frontend/lib/preflightSimulator.ts
 *
 * Pre-flight Soroban transaction simulation analyzer before Freighter signing prompt.
 * Validates contract invariants and provides fee visibility.
 */

export interface PreflightSimulationCost {
  cpuInstructions: number;
  memoryBytes: number;
  minResourceFeeStroops: number;
  minResourceFeeXlm: string;
}

export interface PreflightResult {
  success: boolean;
  cost?: PreflightSimulationCost;
  errorDetail?: string;
  returnValue?: any;
}

const STROOPS_PER_XLM = 10_000_000;

/**
 * Analyzes a raw simulateTransaction RPC response to assess viability and fee requirements.
 *
 * @param simResponse - The Soroban RPC simulation response object
 * @returns Parsed PreflightResult
 */
export function analyzeSimulationResponse(simResponse: any): PreflightResult {
  if (!simResponse || typeof simResponse !== "object") {
    return {
      success: false,
      errorDetail: "Simulation response was empty or malformed",
    };
  }

  // Check for error in simulation response
  if (simResponse.error) {
    return {
      success: false,
      errorDetail:
        typeof simResponse.error === "string"
          ? simResponse.error
          : simResponse.error.message || "Simulation failed with host error",
    };
  }

  const result = simResponse.result || simResponse;
  if (result.error) {
    return {
      success: false,
      errorDetail: result.error,
    };
  }

  const minResourceFeeStroops = Number(result.minResourceFee || simResponse.minResourceFee || 0);
  const cost = result.cost || simResponse.cost || {};
  const cpuInstructions = Number(cost.cpuInsns || 0);
  const memoryBytes = Number(cost.memBytes || 0);

  const minResourceFeeXlm = (minResourceFeeStroops / STROOPS_PER_XLM).toFixed(7);

  return {
    success: true,
    cost: {
      cpuInstructions,
      memoryBytes,
      minResourceFeeStroops,
      minResourceFeeXlm,
    },
    returnValue: result.retval || simResponse.retval,
  };
}
