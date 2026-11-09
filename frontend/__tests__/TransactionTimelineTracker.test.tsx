import React from "react";
import { render, screen } from "@testing-library/react";
import {
  TransactionTimelineTracker,
  TimelineEvent,
} from "../components/TransactionTimelineTracker";

describe("TransactionTimelineTracker", () => {
  const dummyTx = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  it("renders 5 default escrow milestone steps", () => {
    render(<TransactionTimelineTracker currentStage="in_progress" />);

    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Funded")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("marks completed steps with checkmark and marks active step", () => {
    render(<TransactionTimelineTracker currentStage="submitted" />);

    const stepCreated = screen.getByTestId("timeline-step-created");
    expect(stepCreated.textContent).toContain("✓");

    const stepFunded = screen.getByTestId("timeline-step-funded");
    expect(stepFunded.textContent).toContain("✓");

    const stepInProgress = screen.getByTestId("timeline-step-in_progress");
    expect(stepInProgress.textContent).toContain("✓");

    const stepSubmitted = screen.getByTestId("timeline-step-submitted");
    expect(stepSubmitted.textContent).toContain("4"); // Active step number
  });

  it("displays explorer link for stages with on-chain transaction hashes", () => {
    const events: TimelineEvent[] = [
      {
        stage: "funded",
        timestamp: "2026-11-09 20:00",
        txHash: dummyTx,
      },
    ];

    render(
      <TransactionTimelineTracker
        currentStage="in_progress"
        events={events}
        network="testnet"
      />
    );

    expect(screen.getByText("2026-11-09 20:00")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/tx/${dummyTx}`
    );
  });

  it("displays special banner when escrow is in dispute", () => {
    render(<TransactionTimelineTracker currentStage="disputed" />);
    expect(screen.getByText("⚠ Dispute In Review")).toBeInTheDocument();
  });

  it("displays refund banner when escrow is refunded", () => {
    render(<TransactionTimelineTracker currentStage="refunded" />);
    expect(screen.getByText("↩ Refunded to Client")).toBeInTheDocument();
  });
});
