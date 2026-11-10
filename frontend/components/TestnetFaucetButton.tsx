"use client";

import React, { useState } from "react";

export interface TestnetFaucetButtonProps {
  publicKey: string;
  endpoint?: string;
  onFunded?: (txHash: string) => void;
  className?: string;
}

export const TestnetFaucetButton: React.FC<TestnetFaucetButtonProps> = ({
  publicKey,
  endpoint = "/api/faucet/fund",
  onFunded,
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const handleRequestFunds = async () => {
    if (isLoading || cooldownSeconds > 0 || !publicKey) return;

    setIsLoading(true);
    setErrorMsg(null);
    setTxHash(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: publicKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After")) || 60;
          setCooldownSeconds(retryAfter);
          throw new Error(`Rate limit exceeded. Please wait ${retryAfter}s`);
        }
        throw new Error(data.message || data.error || "Failed to fund account");
      }

      const hash = data.txHash || data.hash || "mock-tx-hash";
      setTxHash(hash);
      setCooldownSeconds(30);
      onFunded?.(hash);
    } catch (err: any) {
      setErrorMsg(err.message || "Network error requesting funds");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`} data-testid="faucet-container">
      <button
        type="button"
        onClick={handleRequestFunds}
        disabled={isLoading || cooldownSeconds > 0 || !publicKey}
        aria-busy={isLoading}
        aria-label="Request Testnet XLM"
        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white transition-colors duration-150 flex items-center justify-center gap-1.5 shadow-sm"
      >
        {isLoading ? (
          <>
            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
            <span>Funding...</span>
          </>
        ) : cooldownSeconds > 0 ? (
          <span>Cooldown ({cooldownSeconds}s)</span>
        ) : (
          <span>Request Testnet XLM</span>
        )}
      </button>

      {txHash && (
        <span
          data-testid="faucet-success-msg"
          className="text-xs text-green-600 font-mono truncate max-w-xs"
        >
          Funded! Tx: {txHash.slice(0, 10)}...
        </span>
      )}

      {errorMsg && (
        <span
          data-testid="faucet-error-msg"
          className="text-xs text-red-600 truncate max-w-xs"
        >
          {errorMsg}
        </span>
      )}
    </div>
  );
};

export default TestnetFaucetButton;
