import React from "react";
import { StellarExplorerLink } from "./StellarExplorerLink";

export type EscrowStage =
  | "created"
  | "funded"
  | "in_progress"
  | "submitted"
  | "approved"
  | "released"
  | "disputed"
  | "refunded";

export interface TimelineEvent {
  stage: EscrowStage;
  label?: string;
  timestamp?: string;
  txHash?: string;
  notes?: string;
}

export interface TransactionTimelineTrackerProps {
  currentStage: EscrowStage;
  events?: TimelineEvent[];
  network?: "testnet" | "mainnet";
}

const DEFAULT_STAGES: { stage: EscrowStage; label: string; description: string }[] = [
  { stage: "created", label: "Created", description: "Escrow terms initialized" },
  { stage: "funded", label: "Funded", description: "Client locked funds on Stellar" },
  { stage: "in_progress", label: "In Progress", description: "Freelancer started milestone" },
  { stage: "submitted", label: "Submitted", description: "Deliverable SHA-256 registered" },
  { stage: "released", label: "Released", description: "Funds settled to freelancer" },
];

const STAGE_ORDER: Record<EscrowStage, number> = {
  created: 1,
  funded: 2,
  in_progress: 3,
  submitted: 4,
  approved: 5,
  released: 5,
  disputed: 99,
  refunded: 99,
};

export const TransactionTimelineTracker: React.FC<TransactionTimelineTrackerProps> = ({
  currentStage,
  events = [],
  network = "testnet",
}) => {
  const currentStepNumber = STAGE_ORDER[currentStage] ?? 1;
  const isDisputed = currentStage === "disputed";
  const isRefunded = currentStage === "refunded";

  const getEventForStage = (stage: EscrowStage): TimelineEvent | undefined => {
    return events.find((e) => e.stage === stage);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Escrow Settlement Lifecycle
        </h3>
        {isDisputed && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            ⚠ Dispute In Review
          </span>
        )}
        {isRefunded && (
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            ↩ Refunded to Client
          </span>
        )}
      </div>

      <div className="relative flex flex-col space-y-6 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        {DEFAULT_STAGES.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = !isDisputed && !isRefunded && currentStepNumber > stepNumber;
          const isActive = !isDisputed && !isRefunded && currentStepNumber === stepNumber;
          const matchingEvent = getEventForStage(step.stage);

          return (
            <div
              key={step.stage}
              data-testid={`timeline-step-${step.stage}`}
              className="flex flex-1 flex-col items-center text-center relative px-2"
            >
              {/* Connector line on desktop */}
              {idx < DEFAULT_STAGES.length - 1 && (
                <div
                  className={`hidden sm:block absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                    isCompleted ? "bg-indigo-600 dark:bg-indigo-500" : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}

              {/* Step indicator circle */}
              <div
                className={`z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                    : isActive
                    ? "border-2 border-indigo-600 bg-white text-indigo-600 dark:bg-zinc-900 dark:text-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-950/50"
                    : "border border-zinc-300 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                }`}
              >
                {isCompleted ? "✓" : stepNumber}
              </div>

              {/* Label & Description */}
              <div className="mt-2.5">
                <span
                  className={`block text-xs font-semibold ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : isCompleted
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {matchingEvent?.label || step.label}
                </span>
                <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {matchingEvent?.notes || step.description}
                </span>

                {/* Optional Timestamp & Explorer Link */}
                {matchingEvent?.timestamp && (
                  <span className="mt-1 block text-[10px] text-zinc-400">
                    {matchingEvent.timestamp}
                  </span>
                )}
                {matchingEvent?.txHash && (
                  <div className="mt-1 flex justify-center">
                    <StellarExplorerLink
                      type="tx"
                      value={matchingEvent.txHash}
                      network={network}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
