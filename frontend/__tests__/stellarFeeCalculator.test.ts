import {
  stroopsToXlm,
  xlmToStroops,
  calculateFeeTiers,
  BASE_FEE_STROOPS,
} from "../utils/stellarFeeCalculator";

describe("stellarFeeCalculator", () => {
  it("converts Stroops to formatted XLM with 7 decimal places", () => {
    expect(stroopsToXlm(100)).toBe("0.0000100");
    expect(stroopsToXlm(10_000_000)).toBe("1.0000000");
    expect(stroopsToXlm(BigInt(25_000_000))).toBe("2.5000000");
  });

  it("throws on invalid stroop input", () => {
    expect(() => stroopsToXlm(-100)).toThrow();
  });

  it("converts XLM to Stroops", () => {
    expect(xlmToStroops("1")).toBe(10_000_000);
    expect(xlmToStroops("0.00001")).toBe(100);
    expect(xlmToStroops(5.5)).toBe(55_000_000);
  });

  it("calculates 3 fee tiers for single operation", () => {
    const tiers = calculateFeeTiers(BASE_FEE_STROOPS, 1);
    expect(tiers).toHaveLength(3);

    const [standard, fast, urgent] = tiers;
    expect(standard.id).toBe("standard");
    expect(standard.feeStroops).toBe(100);
    expect(standard.feeXlm).toBe("0.0000100");

    expect(fast.id).toBe("fast");
    expect(fast.feeStroops).toBe(150);

    expect(urgent.id).toBe("urgent");
    expect(urgent.feeStroops).toBe(300);
  });

  it("multiplies fees proportionally by operation count", () => {
    const tiers = calculateFeeTiers(BASE_FEE_STROOPS, 3);
    const [standard, fast, urgent] = tiers;

    expect(standard.feeStroops).toBe(300);
    expect(fast.feeStroops).toBe(450);
    expect(urgent.feeStroops).toBe(900);
  });
});
