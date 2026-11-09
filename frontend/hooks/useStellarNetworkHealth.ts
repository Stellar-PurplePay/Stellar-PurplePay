/**
 * frontend/hooks/useStellarNetworkHealth.ts
 *
 * React hook to poll Stellar node diagnostics from /api/health/stellar
 * and drive network connectivity badges.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface StellarNetworkHealthState {
  status: "healthy" | "degraded" | "unhealthy" | "loading";
  network: "testnet" | "mainnet";
  latencyMs?: number;
  latestLedger?: number;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStellarNetworkHealth(
  pollIntervalMs: number = 15_000
): StellarNetworkHealthState {
  const [status, setStatus] = useState<"healthy" | "degraded" | "unhealthy" | "loading">("loading");
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet");
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [latestLedger, setLatestLedger] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health/stellar");
      if (!res.ok && res.status !== 503) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!isMountedRef.current) return;

      const passphrase = data.horizon?.networkPassphrase || "";
      const detectedNetwork: "testnet" | "mainnet" = passphrase.includes("Test")
        ? "testnet"
        : "mainnet";

      setStatus(data.status || "unhealthy");
      setNetwork(detectedNetwork);
      setLatencyMs(data.sorobanRpc?.latencyMs);
      setLatestLedger(data.sorobanRpc?.latestLedger || data.horizon?.coreLatestLedger);
      setError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setStatus("unhealthy");
      setError(err?.message || "Failed to query Stellar network health");
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHealth();

    const interval = setInterval(() => {
      fetchHealth();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchHealth, pollIntervalMs]);

  return {
    status,
    network,
    latencyMs,
    latestLedger,
    error,
    refresh: fetchHealth,
  };
}
