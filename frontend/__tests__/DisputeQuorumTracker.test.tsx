import React from "react";
import { render, screen } from "@testing-library/react";
import { DisputeQuorumTracker } from "../components/DisputeQuorumTracker";

describe("DisputeQuorumTracker component", () => {
  const mockVotes = [
    {
      arbitrator: "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP",
      clientAwardXlm: "70.00",
      freelancerAwardXlm: "30.00",
    },
    {
      arbitrator: "GBWFZHBYEKF5MR2MHW7JAZX6ZRI2PKKBL6IALEMJSBMU4JMDSIB34KP5",
      clientAwardXlm: "70.00",
      freelancerAwardXlm: "30.00",
    },
  ];

  it("renders with quorum reached and consensus split ruling", () => {
    render(
      <DisputeQuorumTracker
        totalRemainingXlm="100.00"
        votes={mockVotes}
        hasQuorum={true}
        winningSplit={{ clientAwardXlm: "70.00", freelancerAwardXlm: "30.00" }}
      />
    );

    expect(screen.getByRole("region", { name: "Arbitrator Quorum Progress" })).toBeInTheDocument();
    expect(screen.getByText("Quorum Reached")).toBeInTheDocument();
    expect(screen.getByText(/Consensus Award Ruling:/)).toBeInTheDocument();
    expect(screen.getByText("100.00 XLM")).toBeInTheDocument();
  });

  it("renders pending state when quorum is not yet reached", () => {
    render(
      <DisputeQuorumTracker
        totalRemainingXlm="100.00"
        votes={[mockVotes[0]]}
        hasQuorum={false}
      />
    );

    expect(screen.getByText("Awaiting Panel Consensus (1/3)")).toBeInTheDocument();
    expect(screen.getAllByText("Awaiting vote submission")).toHaveLength(2);
  });
});
