/**
 * frontend/components/EscrowDeliverableModal.tsx
 *
 * Accessible modal allowing freelancers to hash deliverables client-side
 * and submit cryptographic proof-of-work hashes to Soroban escrow contracts.
 */

import React, { useState } from "react";

export interface EscrowDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitDeliverable: (hashHex: string, milestoneId?: number) => Promise<void>;
  jobId: string;
  milestones?: Array<{ id: number; description: string }>;
}

export const EscrowDeliverableModal: React.FC<EscrowDeliverableModalProps> = ({
  isOpen,
  onClose,
  onSubmitDeliverable,
  jobId,
  milestones = [],
}) => {
  const [inputText, setInputText] = useState("");
  const [computedHash, setComputedHash] = useState("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | undefined>(
    milestones[0]?.id
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleComputeHash = async (content: string) => {
    setInputText(content);
    setError(null);
    if (!content.trim()) {
      setComputedHash("");
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setComputedHash(hashHex);
    } catch (err: any) {
      setError("Failed to compute SHA-256 hash: " + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setComputedHash(hashHex);
      setInputText(`File: ${file.name} (${file.size} bytes)`);
    } catch (err: any) {
      setError("Failed to hash file: " + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!computedHash) {
      setError("Please enter or upload a deliverable to generate a proof hash.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitDeliverable(computedHash, selectedMilestoneId);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit deliverable to contract");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deliverable-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col gap-4 font-sans">
        <div className="flex justify-between items-center">
          <h2
            id="deliverable-modal-title"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            Submit Deliverable Proof
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

        {milestones.length > 0 && (
          <div>
            <label
              htmlFor="milestone-select"
              className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block"
            >
              Target Milestone
            </label>
            <select
              id="milestone-select"
              value={selectedMilestoneId}
              onChange={(e) => setSelectedMilestoneId(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  Milestone #{m.id}: {m.description}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
            Upload Deliverable File
          </label>
          <input
            type="file"
            onChange={handleFileUpload}
            aria-label="Deliverable file upload"
            className="text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300"
          />
        </div>

        <div>
          <label
            htmlFor="deliverable-text"
            className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block"
          >
            Or Enter Deliverable Content / IPFS URL
          </label>
          <textarea
            id="deliverable-text"
            rows={3}
            value={inputText}
            onChange={(e) => handleComputeHash(e.target.value)}
            placeholder="Paste commit URL, IPFS CID, or completion text..."
            className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          />
        </div>

        {computedHash && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide block">
              Cryptographic Proof Hash (SHA-256)
            </span>
            <span className="text-xs font-mono break-all text-emerald-900 dark:text-emerald-100">
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
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors ${
              !computedHash || isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit Proof On-Chain"}
          </button>
        </div>
      </div>
    </div>
  );
};
