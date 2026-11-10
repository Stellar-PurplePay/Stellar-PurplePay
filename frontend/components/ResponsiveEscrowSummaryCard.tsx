import React, { useState } from "react";
import { AccessibleProgressBar } from "./AccessibleProgressBar";

export interface ResponsiveEscrowSummaryCardProps {
  jobId: string;
  client: string;
  freelancer: string;
  totalAmount: number;
  releasedAmount: number;
  status: "Created" | "InProgress" | "Completed" | "Refunded" | "Disputed" | string;
  tokenSymbol?: string;
  milestonesCount?: number;
  onActionClick?: (action: string) => void;
}

const STATUS_BADGES: Record<string, { label: string; style: string }> = {
  Created: {
    label: "Created",
    style: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  },
  InProgress: {
    label: "In Progress",
    style: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  Completed: {
    label: "Settled / Complete",
    style: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  Refunded: {
    label: "Refunded to Client",
    style: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  },
  Disputed: {
    label: "Dispute Active",
    style: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
};

export const ResponsiveEscrowSummaryCard: React.FC<ResponsiveEscrowSummaryCardProps> = ({
  jobId,
  client,
  freelancer,
  totalAmount,
  releasedAmount,
  status,
  tokenSymbol = "XLM",
  milestonesCount = 1,
  onActionClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const remainingAmount = Math.max(0, totalAmount - releasedAmount);
  const statusInfo = STATUS_BADGES[status] || {
    label: status,
    style: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b p-4 sm:p-5 dark:border-gray-700">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Escrow Contract Job</span>
          <h3 className="font-mono text-base font-bold text-gray-900 dark:text-white sm:text-lg">
            {jobId}
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.style}`}
          >
            {statusInfo.label}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden rounded-lg border border-gray-300 p-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-expanded={isExpanded}
            aria-label="Toggle details breakdown"
          >
            {isExpanded ? "▲ Hide" : "▼ Details"}
          </button>
        </div>
      </div>

      {/* Main Grid: Amounts & Progress */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Escrowed</span>
            <p className="mt-1 font-mono text-lg font-bold text-gray-900 dark:text-white">
              {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50/60 p-3 dark:bg-emerald-950/20">
            <span className="text-xs text-emerald-800 dark:text-emerald-300">Released to Date</span>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-900 dark:text-emerald-100">
              {releasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
            </p>
          </div>
          <div className="rounded-lg bg-indigo-50/60 p-3 dark:bg-indigo-950/20">
            <span className="text-xs text-indigo-800 dark:text-indigo-300">Locked Balance</span>
            <p className="mt-1 font-mono text-lg font-bold text-indigo-900 dark:text-indigo-100">
              {remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
            </p>
          </div>
        </div>

        {/* Progress Bar Component */}
        <div className="mt-4">
          <AccessibleProgressBar
            value={releasedAmount}
            max={totalAmount || 1}
            label={`Disbursement Progress (${milestonesCount} milestone${milestonesCount > 1 ? "s" : ""})`}
            color="emerald"
          />
        </div>

        {/* Expandable / Mobile Drawer Details */}
        <div
          className={`mt-4 space-y-2 border-t pt-3 sm:block dark:border-gray-700 ${
            isExpanded ? "block" : "hidden sm:block"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Client Account:</span>
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
              {truncateAddress(client)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Freelancer Account:</span>
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
              {truncateAddress(freelancer)}
            </span>
          </div>
        </div>

        {/* Actions Bar */}
        {onActionClick && (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-3 dark:border-gray-700">
            <button
              type="button"
              onClick={() => onActionClick("view_deliverables")}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              View Deliverables
            </button>
            {status === "InProgress" && (
              <button
                type="button"
                onClick={() => onActionClick("release_funds")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Release Milestone
              </button>
            )}
            {status === "InProgress" && (
              <button
                type="button"
                onClick={() => onActionClick("raise_dispute")}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                Raise Dispute
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

