import { useState, useEffect, useCallback } from "react";

export interface StateDrift {
  field: string;
  local: any;
  onChain: any;
  severity: "CRITICAL" | "WARNING" | "INFO";
  message?: string;
}

export interface UseEscrowReconciliationOptions {
  enabled?: boolean;
}

export interface UseEscrowReconciliationReturn {
  isSynchronized: boolean;
  drifts: StateDrift[];
  loading: boolean;
  error: string | null;
  sync: () => Promise<void>;
}

export function useEscrowReconciliation(
  jobId: string | null | undefined,
  options: UseEscrowReconciliationOptions = {}
): UseEscrowReconciliationReturn {
  const { enabled = true } = options;

  const [isSynchronized, setIsSynchronized] = useState<boolean>(true);
  const [drifts, setDrifts] = useState<StateDrift[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkReconciliation = useCallback(async () => {
    if (!jobId || !enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/escrow/reconciliation/${encodeURIComponent(jobId)}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `Failed to fetch reconciliation report (${response.status})`);
      }

      setIsSynchronized(Boolean(json.isSynchronized));
      setDrifts(json.data?.drifts || []);
    } catch (err: any) {
      setError(err.message || "Failed to check escrow reconciliation");
    } finally {
      setLoading(false);
    }
  }, [jobId, enabled]);

  useEffect(() => {
    checkReconciliation();
  }, [checkReconciliation]);

  return {
    isSynchronized,
    drifts,
    loading,
    error,
    sync: checkReconciliation,
  };
}
