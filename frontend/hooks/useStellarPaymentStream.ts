import { useState, useEffect, useRef } from "react";

export interface StreamPayment {
  id: string;
  type: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  txHash: string;
  createdAt: string;
}

export interface UseStellarPaymentStreamOptions {
  accountAddress?: string | null;
  onPayment?: (payment: StreamPayment) => void;
  enabled?: boolean;
}

export interface UseStellarPaymentStreamResult {
  payments: StreamPayment[];
  lastPayment: StreamPayment | null;
  isConnected: boolean;
  error: string | null;
  clearPayments: () => void;
}

/**
 * Custom React hook subscribing to real-time incoming payments via Server-Sent Events.
 */
export function useStellarPaymentStream({
  accountAddress,
  onPayment,
  enabled = true,
}: UseStellarPaymentStreamOptions): UseStellarPaymentStreamResult {
  const [payments, setPayments] = useState<StreamPayment[]>([]);
  const [lastPayment, setLastPayment] = useState<StreamPayment | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onPaymentRef = useRef(onPayment);
  onPaymentRef.current = onPayment;

  useEffect(() => {
    if (!enabled || !accountAddress || !accountAddress.startsWith("G") || accountAddress.length !== 56) {
      setIsConnected(false);
      return;
    }

    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/stellar/stream/payments/${accountAddress}`);

      es.addEventListener("connected", () => {
        setIsConnected(true);
        setError(null);
      });

      es.onmessage = (event) => {
        try {
          const payment: StreamPayment = JSON.parse(event.data);
          if (payment && payment.id) {
            setLastPayment(payment);
            setPayments((prev) => [payment, ...prev].slice(0, 50));
            if (onPaymentRef.current) {
              onPaymentRef.current(payment);
            }
          }
        } catch (parseErr: any) {
          setError(`Failed to parse payment data: ${parseErr.message}`);
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        setError("Connection to payment stream interrupted");
      };
    } catch (initErr: any) {
      setError(`Failed to open event stream: ${initErr.message}`);
    }

    return () => {
      if (es) {
        es.close();
      }
      setIsConnected(false);
    };
  }, [accountAddress, enabled]);

  const clearPayments = () => {
    setPayments([]);
    setLastPayment(null);
  };

  return {
    payments,
    lastPayment,
    isConnected,
    error,
    clearPayments,
  };
}
