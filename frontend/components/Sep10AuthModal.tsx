"use client";

import React, { useState } from "react";

export interface Sep10AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string;
  onSuccess: (token: string) => void;
  onSignChallenge?: (challengeXdr: string) => Promise<string>;
  authEndpoint?: string;
}

type AuthStep = "idle" | "requesting" | "signing" | "verifying" | "success" | "error";

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

export const Sep10AuthModal: React.FC<Sep10AuthModalProps> = ({
  isOpen,
  onClose,
  publicKey,
  onSuccess,
  onSignChallenge,
  authEndpoint = "/api/auth/sep10",
}) => {
  const [step, setStep] = useState<AuthStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAuth = async () => {
    setStep("requesting");
    setErrorMsg(null);

    try {
      // 1. Request challenge
      const res = await fetch(
        `${authEndpoint}/challenge?account=${encodeURIComponent(publicKey)}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to retrieve challenge: ${text}`);
      }

      const { transaction: challengeXdr } = await res.json();
      if (!challengeXdr) {
        throw new Error("Challenge transaction not returned by server");
      }

      // 2. Sign challenge via Freighter or custom sign callback
      setStep("signing");
      let signedXdr: string;
      if (onSignChallenge) {
        signedXdr = await onSignChallenge(challengeXdr);
      } else {
        // Fallback to browser window freighter extension
        const freighter = (window as any).freighterApi;
        if (!freighter || !freighter.signTransaction) {
          throw new Error("Freighter wallet extension not detected");
        }
        signedXdr = await freighter.signTransaction(challengeXdr);
      }

      // 3. Verify and exchange token
      setStep("verifying");
      const tokenRes = await fetch(`${authEndpoint}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: signedXdr }),
      });

      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Authentication verification failed");
      }

      const { token } = await tokenRes.json();
      setStep("success");
      onSuccess(token);
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message || "An unexpected authentication error occurred");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sep10-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-3 text-2xl">
            🔐
          </div>
          <h2
            id="sep10-modal-title"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            Stellar Web Authentication
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            SEP-0010 cryptographically verified wallet login
          </p>
        </div>

        <div className="mb-6 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 border border-gray-100 dark:border-gray-800 text-xs">
          <span className="text-gray-500 dark:text-gray-400 block font-sans">
            Connected Wallet:
          </span>
          <span
            data-testid="auth-wallet-address"
            className="font-mono font-semibold text-gray-900 dark:text-white"
          >
            {truncateAddress(publicKey)}
          </span>
        </div>

        {step === "idle" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Sign an off-chain challenge transaction with your wallet. This proves ownership
              of your Stellar account without sending any funds.
            </p>
            <button
              type="button"
              data-testid="start-auth-button"
              onClick={handleStartAuth}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              Sign In with Wallet
            </button>
          </div>
        )}

        {(step === "requesting" || step === "signing" || step === "verifying") && (
          <div className="text-center py-6 space-y-3" data-testid="auth-loading-state">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {step === "requesting" && "Requesting server challenge..."}
              {step === "signing" && "Awaiting wallet signature..."}
              {step === "verifying" && "Verifying challenge response..."}
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4 space-y-2" data-testid="auth-success-state">
            <div className="text-3xl text-green-500">✓</div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Authenticated Successfully
            </h3>
            <p className="text-xs text-gray-500">
              Your cryptographic session token has been securely issued.
            </p>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4" data-testid="auth-error-state">
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs"
            >
              {errorMsg}
            </div>
            <button
              type="button"
              data-testid="retry-auth-button"
              onClick={handleStartAuth}
              className="w-full py-2 px-4 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-xs transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
