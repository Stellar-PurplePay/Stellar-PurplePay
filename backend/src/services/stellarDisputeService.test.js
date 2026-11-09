"use strict";

const { StellarDisputeService } = require("./stellarDisputeService");

describe("stellarDisputeService", () => {
  let service;
  const arb1 = "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP";
  const arb2 = "GBWFZHBYEKF5MR2MHW7JAZX6ZRI2PKKBL6IALEMJSBMU4JMDSIB34KP5";
  const arb3 = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";

  beforeEach(() => {
    service = new StellarDisputeService();
  });

  it("detects 2-of-3 quorum when two arbitrators agree on the same split", () => {
    const votes = [
      { arbitrator: arb1, client_award: "7000000", freelancer_award: "3000000" },
      { arbitrator: arb2, client_award: "5000000", freelancer_award: "5000000" },
      { arbitrator: arb3, client_award: "7000000", freelancer_award: "3000000" },
    ];

    const result = service.tallyArbitratorVotes(votes, "10000000");

    expect(result.totalVotesCast).toBe(3);
    expect(result.hasQuorum).toBe(true);
    expect(result.winningProposal).toEqual({
      clientAward: "7000000",
      freelancerAward: "3000000",
      agreeingVoters: [arb1, arb3],
      voteCount: 2,
    });
    expect(result.isPendingMoreVotes).toBe(false);
  });

  it("reports pending votes when only 1 vote has been cast", () => {
    const votes = [
      { arbitrator: arb1, client_award: "7000000", freelancer_award: "3000000" },
    ];

    const result = service.tallyArbitratorVotes(votes, "10000000");

    expect(result.totalVotesCast).toBe(1);
    expect(result.hasQuorum).toBe(false);
    expect(result.winningProposal).toBeNull();
    expect(result.isPendingMoreVotes).toBe(true);
  });

  it("throws error when vote awards do not sum to total remaining balance", () => {
    const votes = [
      { arbitrator: arb1, client_award: "8000000", freelancer_award: "3000000" },
    ];

    expect(() => service.tallyArbitratorVotes(votes, "10000000")).toThrow(
      "do not sum to remaining total"
    );
  });

  it("rejects duplicate votes from the same arbitrator", () => {
    const votes = [
      { arbitrator: arb1, client_award: "5000000", freelancer_award: "5000000" },
      { arbitrator: arb1, client_award: "5000000", freelancer_award: "5000000" },
    ];

    expect(() => service.tallyArbitratorVotes(votes, "10000000")).toThrow(
      "Duplicate vote detected"
    );
  });
});
