import { renderHook, act } from "@testing-library/react";
import { useEscrowDeliverable } from "../hooks/useEscrowDeliverable";

describe("useEscrowDeliverable hook", () => {
  it("initializes with default closed state", () => {
    const { result } = renderHook(() => useEscrowDeliverable());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.deliverableHash).toBeNull();
  });

  it("opens modal with milestone ID", () => {
    const { result } = renderHook(() => useEscrowDeliverable());

    act(() => {
      result.current.openModal(2);
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.targetMilestoneId).toBe(2);
  });

  it("submits deliverable successfully and closes modal", async () => {
    const { result } = renderHook(() => useEscrowDeliverable());
    const mockSubmit = jest.fn().mockResolvedValue(true);

    act(() => {
      result.current.openModal(1);
    });

    let success: boolean = false;
    await act(async () => {
      success = await result.current.submit(mockSubmit, "0x1234abcd", 1);
    });

    expect(success).toBe(true);
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.deliverableHash).toBe("0x1234abcd");
    expect(result.current.error).toBeNull();
    expect(mockSubmit).toHaveBeenCalledWith("0x1234abcd", 1);
  });

  it("handles submission rejection gracefully", async () => {
    const { result } = renderHook(() => useEscrowDeliverable());
    const mockSubmit = jest.fn().mockRejectedValue(new Error("RPC submission timeout"));

    let success: boolean = true;
    await act(async () => {
      success = await result.current.submit(mockSubmit, "0x1234abcd", 1);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("RPC submission timeout");
    expect(result.current.isSubmitting).toBe(false);
  });
});
