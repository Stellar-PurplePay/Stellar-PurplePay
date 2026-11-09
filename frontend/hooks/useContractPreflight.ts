/**
 * frontend/hooks/useContractPreflight.ts
 *
 * React hook to manage Soroban transaction pre-flight simulation and fee visibility modal.
 */

import { useState, useCallback } from "react";
import { analyzeSimulationResponse, PreflightResult } from "../lib/preflightSimulator";

export interface UseContractPreflightState {
  isSimulating: boolean;
  preflightResult: PreflightResult | null;
  isModalOpen: boolean;
  error: string | null;
  simulate: (simFn: () => Promise<any>) => Promise<PreflightResult>;
  openModal: () => void;
  closeModal: () => void;
  reset: () => void;
}

export function useContractPreflight(): UseContractPreflightState {
  const [isSimulating, setIsSimulating] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(async (simFn: () => Promise<any>): Promise<PreflightResult> => {
    setIsSimulating(true);
    setError(null);
    try {
      const raw = await simFn();
      const analyzed = analyzeSimulationResponse(raw);
      setPreflightResult(analyzed);
      if (!analyzed.success) {
        setError(analyzed.errorDetail || "Simulation failed");
      } else {
        setIsModalOpen(true);
      }
      return analyzed;
    } catch (err: any) {
      const msg = err?.message || "Simulation execution failed";
      const failureResult: PreflightResult = {
        success: false,
        errorDetail: msg,
      };
      setError(msg);
      setPreflightResult(failureResult);
      return failureResult;
    } finally {
      setIsSimulating(false);
    }
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const reset = useCallback(() => {
    setIsSimulating(false);
    setPreflightResult(null);
    setIsModalOpen(false);
    setError(null);
  }, []);

  return {
    isSimulating,
    preflightResult,
    isModalOpen,
    error,
    simulate,
    openModal,
    closeModal,
    reset,
  };
}
