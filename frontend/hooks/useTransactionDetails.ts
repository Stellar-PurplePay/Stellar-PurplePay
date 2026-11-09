import { useState, useEffect, useCallback } from "react";

export interface TransactionDetails {
  hash: string;
  successful: boolean;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  feeCharged: {
    stroops: number;
    xlm: string;
  };
  maxFee: {
    stroops: number;
    xlm: string;
  };
  operationCount: number;
  memo: {
    type: string;
    value: string | null;
  };
  operations: Array<{
    id: string;
    type: string;
    sourceAccount: string;
    details: Record<string, any>;
  }>;
}

export interface UseTransactionDetailsOptions {
  enabled?: boolean;
  bypassCache?: boolean;
}

export interface UseTransactionDetailsReturn {
  data: TransactionDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTransactionDetails(
  txHash: string | null | undefined,
  options: UseTransactionDetailsOptions = {}
): UseTransactionDetailsReturn {
  const { enabled = true, bypassCache = false } = options;

  const [data, setData] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!txHash || !enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/stellar/transactions/${encodeURIComponent(txHash.trim())}${
        bypassCache ? "?bypassCache=true" : ""
      }`;
      const response = await fetch(url);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `Failed to fetch transaction (${response.status})`);
      }

      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch transaction details");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [txHash, enabled, bypassCache]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    data,
    loading,
    error,
    refetch: fetchDetails,
  };
}
