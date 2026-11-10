import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GovernanceProposalCard } from "../components/GovernanceProposalCard";

describe("GovernanceProposalCard", () => {
  const baseProps = {
    id: 42,
    title: "Upgrade Soroban Protocol Parameters",
    description: "Lower fee basis points from 100 bps to 50 bps across all milestones.",
    votesFor: 800,
    votesAgainst: 200,
    quorumThreshold: 1000,
    status: "active" as const,
  };

  it("renders proposal title, status, and quorum progress", () => {
    render(<GovernanceProposalCard {...baseProps} />);

    expect(screen.getByText("Proposal #42")).toBeInTheDocument();
    expect(screen.getByText("Upgrade Soroban Protocol Parameters")).toBeInTheDocument();
    expect(screen.getByTestId("proposal-status-badge")).toHaveTextContent("Active");
    expect(screen.getByTestId("quorum-progress-text")).toHaveTextContent("1,000 / 1,000 (100%)");
  });

  it("calculates for and against voting percentages", () => {
    render(<GovernanceProposalCard {...baseProps} />);

    // 800 / 1000 = 80% for, 20% against
    expect(screen.getByText(/For: 800 \(80%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Against: 200 \(20%\)/i)).toBeInTheDocument();
  });

  it("allows voting for and against when proposal is active", () => {
    const onVote = jest.fn();
    render(<GovernanceProposalCard {...baseProps} onVote={onVote} />);

    const voteForBtn = screen.getByTestId("vote-for-button");
    const voteAgainstBtn = screen.getByTestId("vote-against-button");

    fireEvent.click(voteForBtn);
    expect(onVote).toHaveBeenCalledWith(true);

    fireEvent.click(voteAgainstBtn);
    expect(onVote).toHaveBeenCalledWith(false);
  });

  it("displays voted indicator when hasVoted is true", () => {
    render(<GovernanceProposalCard {...baseProps} hasVoted={true} />);

    expect(screen.getByTestId("voted-indicator")).toHaveTextContent(
      "✓ You have voted on this proposal"
    );
    expect(screen.queryByTestId("vote-for-button")).not.toBeInTheDocument();
  });

  it("displays closed voting notice when status is not active", () => {
    render(<GovernanceProposalCard {...baseProps} status="passed" />);

    expect(screen.getByText("Voting closed for this proposal")).toBeInTheDocument();
    expect(screen.queryByTestId("vote-for-button")).not.toBeInTheDocument();
  });
});

