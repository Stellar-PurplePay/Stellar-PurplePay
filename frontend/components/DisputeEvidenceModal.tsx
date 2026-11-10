/**
 * frontend/components/DisputeEvidenceModal.tsx
 *
 * Accessible modal allowing clients and freelancers to submit cryptographic proof
 * and evidence hashes to Soroban escrow contracts during dispute resolution.
 */

import React, { useState } from "react";

export interface DisputeEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitEvidence: (evidenceHashHex: string, description: string) => Promise<void>;
  jobId: string;
  userRole: "client" | "freelancer";
}

export const DisputeEvidenceModal: React.FC<DisputeEvidenceModalProps> = ({
  isOpen,
  onClose,
  onSubmitEvidence,
  jobId,
  userRole,
}) => {
  const [description, setDescription] = useState("");
  const [computedHash, setComputedHash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTextChange = async (text: string) => {
    setDescription(text);
    setError(null);
    if (!text.trim()) {
      setComputedHash("");
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const subtle =
        typeof window !== "undefined"
          ? window.crypto?.subtle
          : typeof globalThis !== "undefined"
          ? (globalThis as any).crypto?.subtle
          : null;
      if (subtle?.digest) {
        const hashBuffer = await subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        setComputedHash(hashHex);
      }
    } catch (err: any) {
      setError("Failed to compute SHA-256 hash: " + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!computedHash) {
      setError("Please enter dispute details or upload an evidence document.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitEvidence(computedHash, description);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit dispute evidence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-evidence-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col gap-4 font-sans">
        <div className="flex justify-between items-center">
          <h2
            id="dispute-evidence-title"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            Submit Dispute Evidence ({userRole.toUpperCase()})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-mono"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Job ID: <span className="font-mono text-gray-700 dark:text-gray-300">{jobId}</span>
        </p>

        <div>
          <label
            htmlFor="evidence-statement"
            className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block"
          >
            Evidence Statement / Deliverable Audit Log
          </label>
          <textarea
            id="evidence-statement"
            rows={4}
            value={description}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Explain dispute claims, timeline, or paste IPFS document CID..."
            className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 font-mono"
          />
        </div>

        {computedHash && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
            <span className="text-[10px] font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide block">
              Cryptographic Evidence Hash (SHA-256)
            </span>
            <span className="text-xs font-mono break-all text-red-900 dark:text-red-100">
              {computedHash}
            </span>
          </div>
        )}

        {error && (
          <div role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!computedHash || isSubmitting}
            onClick={handleSubmit}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700 transition-colors ${
              !computedHash || isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Recording..." : "Record Evidence On-Chain"}
          </button>
        </div>
      </div>
    </div>
  );
};
