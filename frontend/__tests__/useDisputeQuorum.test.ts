import { renderHook, act } from "@testing-library/react";
import { useDisputeQuorum } from "../hooks/useDisputeQuorum";

describe("useDisputeQuorum hook", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const arb1 = "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP";
  const arb2 = "GBWFZHBYEKF5MR2MHW7JAZX6ZRI2PKKBL6IALEMJSBMU4JMDSIB34KP5";

  it("tallies votes and detects quorum consensus", async () => {
    const mockTallyResponse = {
      hasQuorum: true,
      isPendingMoreVotes: false,
      winningProposal: { clientAward: "70.00", freelancerAward: "30.00" },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: mockTallyResponse }),
    } as any);

    const { result } = renderHook(() => useDisputeQuorum("job-101", "100.00"));

    const vote1 = { arbitrator: arb1, clientAwardXlm: "70.00", freelancerAwardXlm: "30.00" };
    const vote2 = { arbitrator: arb2, clientAwardXlm: "70.00", freelancerAwardXlm: "30.00" };

    let success: boolean = false;
    await act(async () => {
      success = await result.current.tallyVotes([vote1, vote2]);
    });

    expect(success).toBe(true);
    expect(result.current.hasQuorum).toBe(true);
    expect(result.current.winningSplit?.clientAwardXlm).toBe("70.00");
    expect(result.current.isPendingMoreVotes).toBe(false);
  });

  it("handles server tally rejection gracefully", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Award split mismatch" }),
    } as any);

    const { result } = renderHook(() => useDisputeQuorum("job-101", "100.00"));

    let success: boolean = true;
    await act(async () => {
      success = await result.current.tallyVotes([
        { arbitrator: arb1, clientAwardXlm: "90.00", freelancerAwardXlm: "30.00" },
      ]);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Award split mismatch");
  });
});
