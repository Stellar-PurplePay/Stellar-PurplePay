/**
 * frontend/hooks/useDisputeQuorum.ts
 *
 * React hook to manage dispute consensus tracking, vote tallies, and quorum state.
 */

import { useState, useCallback } from "react";
import { DisputeArbitratorVote } from "../components/DisputeQuorumTracker";

export interface WinningSplit {
  clientAwardXlm: string;
  freelancerAwardXlm: string;
}

export interface UseDisputeQuorumState {
  votes: DisputeArbitratorVote[];
  hasQuorum: boolean;
  winningSplit: WinningSplit | null;
  isPendingMoreVotes: boolean;
  isLoading: boolean;
  error: string | null;
  tallyVotes: (votesToTally: DisputeArbitratorVote[]) => Promise<boolean>;
  addVote: (vote: DisputeArbitratorVote) => Promise<boolean>;
}

export function useDisputeQuorum(
  jobId: string,
  remainingAmountXlm: string,
  initialVotes: DisputeArbitratorVote[] = []
): UseDisputeQuorumState {
  const [votes, setVotes] = useState<DisputeArbitratorVote[]>(initialVotes);
  const [hasQuorum, setHasQuorum] = useState(false);
  const [winningSplit, setWinningSplit] = useState<WinningSplit | null>(null);
  const [isPendingMoreVotes, setIsPendingMoreVotes] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tallyVotes = useCallback(
    async (votesToTally: DisputeArbitratorVote[]): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stellar/disputes/${encodeURIComponent(jobId)}/tally`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            votes: votesToTally.map((v) => ({
              arbitrator: v.arbitrator,
              client_award: v.clientAwardXlm,
              freelancer_award: v.freelancerAwardXlm,
            })),
            remainingAmount: remainingAmountXlm,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        const data = json.data;

        setVotes(votesToTally);
        setHasQuorum(Boolean(data.hasQuorum));
        setIsPendingMoreVotes(Boolean(data.isPendingMoreVotes));

        if (data.winningProposal) {
          setWinningSplit({
            clientAwardXlm: data.winningProposal.clientAward,
            freelancerAwardXlm: data.winningProposal.freelancerAward,
          });
        } else {
          setWinningSplit(null);
        }

        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to calculate dispute tally");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [jobId, remainingAmountXlm]
  );

  const addVote = useCallback(
    async (vote: DisputeArbitratorVote): Promise<boolean> => {
      const nextVotes = [...votes, vote];
      return tallyVotes(nextVotes);
    },
    [votes, tallyVotes]
  );

  return {
    votes,
    hasQuorum,
    winningSplit,
    isPendingMoreVotes,
    isLoading,
    error,
    tallyVotes,
    addVote,
  };
}
