"use strict";

const { StrKey } = require("@stellar/stellar-sdk");

const QUORUM_THRESHOLD = 2;
const MAX_PANEL_SIZE = 3;

/**
 * Service to manage decentralized 2-of-3 arbitrator panel dispute resolutions.
 */
class StellarDisputeService {
  /**
   * Evaluates consensus across a set of arbitrator votes.
   *
   * @param {Array<{ arbitrator: string, client_award: string|number|bigint, freelancer_award: string|number|bigint }>} votes
   * @param {string|number|bigint} remainingAmount - Total escrow funds remaining
   * @returns {object} Consensus analysis
   */
  tallyArbitratorVotes(votes = [], remainingAmount) {
    if (!Array.isArray(votes)) {
      throw new Error("votes must be an array");
    }

    const expectedTotal = BigInt(remainingAmount);
    const voteMap = new Map();
    const seenArbitrators = new Set();

    for (const vote of votes) {
      if (!vote.arbitrator || !StrKey.isValidEd25519PublicKey(vote.arbitrator)) {
        throw new Error(`Invalid arbitrator public key: ${vote.arbitrator}`);
      }

      if (seenArbitrators.has(vote.arbitrator)) {
        throw new Error(`Duplicate vote detected from arbitrator: ${vote.arbitrator}`);
      }
      seenArbitrators.add(vote.arbitrator);

      const clientAward = BigInt(vote.client_award);
      const freelancerAward = BigInt(vote.freelancer_award);

      if (clientAward < 0n || freelancerAward < 0n) {
        throw new Error("Award amounts cannot be negative");
      }

      if (clientAward + freelancerAward !== expectedTotal) {
        throw new Error(
          `Vote awards (${clientAward} + ${freelancerAward}) do not sum to remaining total (${expectedTotal})`
        );
      }

      const voteKey = `${clientAward}:${freelancerAward}`;
      const currentCount = voteMap.get(voteKey) || { count: 0, clientAward, freelancerAward, voters: [] };
      currentCount.count += 1;
      currentCount.voters.push(vote.arbitrator);
      voteMap.set(voteKey, currentCount);
    }

    let hasQuorum = false;
    let winningProposal = null;

    for (const [key, data] of voteMap.entries()) {
      if (data.count >= QUORUM_THRESHOLD) {
        hasQuorum = true;
        winningProposal = {
          clientAward: data.clientAward.toString(),
          freelancerAward: data.freelancerAward.toString(),
          agreeingVoters: data.voters,
          voteCount: data.count,
        };
        break;
      }
    }

    return {
      totalVotesCast: votes.length,
      requiredQuorum: QUORUM_THRESHOLD,
      maxPanelSize: MAX_PANEL_SIZE,
      hasQuorum,
      winningProposal,
      isPendingMoreVotes: !hasQuorum && votes.length < MAX_PANEL_SIZE,
    };
  }

  /**
   * Validates whether an escrow is currently eligible for dispute resolution.
   */
  isEligibleForDispute(escrowStatus) {
    return escrowStatus === "Disputed";
  }
}

module.exports = new StellarDisputeService();
module.exports.StellarDisputeService = StellarDisputeService;
