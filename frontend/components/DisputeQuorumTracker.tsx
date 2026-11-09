/**
 * frontend/components/DisputeQuorumTracker.tsx
 *
 * Accessible visualization of decentralized 2-of-3 arbitrator panel quorum voting.
 */

import React from "react";

export interface DisputeArbitratorVote {
  arbitrator: string;
  clientAwardXlm: string;
  freelancerAwardXlm: string;
}

export interface DisputeQuorumTrackerProps {
  totalRemainingXlm: string;
  votes: DisputeArbitratorVote[];
  hasQuorum: boolean;
  winningSplit?: {
    clientAwardXlm: string;
    freelancerAwardXlm: string;
  };
  panelSize?: number;
}

export const DisputeQuorumTracker: React.FC<DisputeQuorumTrackerProps> = ({
  totalRemainingXlm,
  votes,
  hasQuorum,
  winningSplit,
  panelSize = 3,
}) => {
  const seats = Array.from({ length: panelSize }, (_, idx) => votes[idx] || null);

  return (
    <div
      role="region"
      aria-label="Arbitrator Quorum Progress"
      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 font-sans shadow-sm flex flex-col gap-4"
    >
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Arbitrator Panel Quorum (2-of-3)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Disputed Escrow Pool:{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {totalRemainingXlm} XLM
            </span>
          </p>
        </div>

        <div>
          {hasQuorum ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Quorum Reached
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Awaiting Panel Consensus ({votes.length}/{panelSize})
            </span>
          )}
        </div>
      </div>

      {hasQuorum && winningSplit && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex justify-between items-center">
          <span className="font-semibold text-emerald-900 dark:text-emerald-200">
            Consensus Award Ruling:
          </span>
          <span className="font-mono text-emerald-800 dark:text-emerald-300">
            Client: {winningSplit.clientAwardXlm} XLM | Freelancer: {winningSplit.freelancerAwardXlm} XLM
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {seats.map((vote, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
              vote
                ? "bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800"
                : "bg-gray-50/60 border-gray-200 dark:bg-gray-800/40 dark:border-gray-800 border-dashed"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Arbitrator #{idx + 1}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  vote
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {vote ? "Voted" : "Pending"}
              </span>
            </div>

            {vote ? (
              <div className="text-xs font-mono flex flex-col gap-1">
                <span className="text-gray-600 dark:text-gray-400 truncate text-[11px]">
                  {vote.arbitrator.slice(0, 6)}...{vote.arbitrator.slice(-4)}
                </span>
                <span className="text-indigo-900 dark:text-indigo-200 text-[11px]">
                  Client: {vote.clientAwardXlm} XLM
                </span>
                <span className="text-indigo-900 dark:text-indigo-200 text-[11px]">
                  Freelancer: {vote.freelancerAwardXlm} XLM
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 dark:text-gray-500 italic py-2">
                Awaiting vote submission
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
