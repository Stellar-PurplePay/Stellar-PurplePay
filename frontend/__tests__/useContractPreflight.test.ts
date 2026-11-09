import { renderHook, act } from "@testing-library/react";
import { useContractPreflight } from "../hooks/useContractPreflight";

describe("useContractPreflight hook", () => {
  it("initializes with default idle state", () => {
    const { result } = renderHook(() => useContractPreflight());

    expect(result.current.isSimulating).toBe(false);
    expect(result.current.preflightResult).toBeNull();
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles successful simulation and opens modal", async () => {
    const { result } = renderHook(() => useContractPreflight());

    const mockSim = jest.fn().mockResolvedValue({
      minResourceFee: "1500",
      cost: { cpuInsns: "100000", memBytes: "25000" },
    });

    let res: any;
    await act(async () => {
      res = await result.current.simulate(mockSim);
    });

    expect(res.success).toBe(true);
    expect(result.current.isSimulating).toBe(false);
    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.preflightResult?.cost?.cpuInstructions).toBe(100000);
    expect(result.current.preflightResult?.cost?.minResourceFeeStroops).toBe(1500);
  });

  it("handles simulation rejection gracefully", async () => {
    const { result } = renderHook(() => useContractPreflight());

    const mockSim = jest.fn().mockRejectedValue(new Error("RPC node unreachable"));

    let res: any;
    await act(async () => {
      res = await result.current.simulate(mockSim);
    });

    expect(res.success).toBe(false);
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.error).toBe("RPC node unreachable");
  });

  it("supports openModal, closeModal, and reset", async () => {
    const { result } = renderHook(() => useContractPreflight());

    act(() => {
      result.current.openModal();
    });
    expect(result.current.isModalOpen).toBe(true);

    act(() => {
      result.current.closeModal();
    });
    expect(result.current.isModalOpen).toBe(false);

    act(() => {
      result.current.reset();
    });
    expect(result.current.preflightResult).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
