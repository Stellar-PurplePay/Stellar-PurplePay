"use client";

import React from "react";

export interface GovernanceProposalCardProps {
  id: string | number;
  title: string;
  description: string;
  votesFor: number;
  votesAgainst: number;
  quorumThreshold: number;
  status: "active" | "passed" | "rejected" | "executed" | "expired";
  hasVoted?: boolean;
  onVote?: (support: boolean) => void;
  className?: string;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  passed: {
    label: "Passed",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  executed: {
    label: "Executed",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  expired: {
    label: "Expired",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  },
};

export const GovernanceProposalCard: React.FC<GovernanceProposalCardProps> = ({
  id,
  title,
  description,
  votesFor = 0,
  votesAgainst = 0,
  quorumThreshold = 1,
  status = "active",
  hasVoted = false,
  onVote,
  className = "",
}) => {
  const totalVotes = votesFor + votesAgainst;
  const quorumProgress = Math.min(100, Math.round((totalVotes / Math.max(1, quorumThreshold)) * 100));
  const forPercentage = totalVotes > 0 ? Math.round((votesFor / totalVotes) * 100) : 0;
  const againstPercentage = totalVotes > 0 ? 100 - forPercentage : 0;

  const badge = STATUS_BADGES[status] || STATUS_BADGES.active;

  return (
    <article
      role="article"
      aria-labelledby={`prop-title-${id}`}
      className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">
          Proposal #{id}
        </span>
        <span
          data-testid="proposal-status-badge"
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <h3
        id={`prop-title-${id}`}
        className="text-base font-bold text-gray-900 dark:text-white mb-2"
      >
        {title}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 line-clamp-3">
        {description}
      </p>

      {/* Quorum Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Quorum Progress</span>
          <span data-testid="quorum-progress-text" className="font-semibold text-gray-700 dark:text-gray-300">
            {totalVotes.toLocaleString()} / {quorumThreshold.toLocaleString()} ({quorumProgress}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            data-testid="quorum-progress-bar"
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${quorumProgress}%` }}
          />
        </div>
      </div>

      {/* Vote distribution bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
            For: {votesFor.toLocaleString()} ({forPercentage}%)
          </span>
          <span className="text-rose-700 dark:text-rose-400 font-medium">
            Against: {votesAgainst.toLocaleString()} ({againstPercentage}%)
          </span>
        </div>
        <div className="w-full bg-rose-200 dark:bg-rose-950/60 rounded-full h-2 flex overflow-hidden">
          <div
            data-testid="votes-for-bar"
            className="bg-emerald-500 h-2 transition-all duration-300"
            style={{ width: `${forPercentage}%` }}
          />
          <div
            data-testid="votes-against-bar"
            className="bg-rose-500 h-2 transition-all duration-300"
            style={{ width: `${againstPercentage}%` }}
          />
        </div>
      </div>

      {/* Voting Controls */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        {hasVoted ? (
          <span data-testid="voted-indicator" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            ✓ You have voted on this proposal
          </span>
        ) : status === "active" ? (
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              data-testid="vote-for-button"
              onClick={() => onVote && onVote(true)}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Vote For
            </button>
            <button
              type="button"
              data-testid="vote-against-button"
              onClick={() => onVote && onVote(false)}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              Vote Against
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">
            Voting closed for this proposal
          </span>
        )}
      </div>
    </article>
  );
};
