import { renderHook, act, waitFor } from "@testing-library/react";
import { useEscrowReconciliation } from "../hooks/useEscrowReconciliation";

describe("useEscrowReconciliation hook", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it("does not fetch when jobId is null", () => {
    const { result } = renderHook(() => useEscrowReconciliation(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.drifts).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches and updates synchronization status on success", async () => {
    const mockPayload = {
      success: true,
      jobId: "job-101",
      isSynchronized: true,
      data: { drifts: [], summary: { totalDrifts: 0 } },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayload,
    });

    const { result } = renderHook(() => useEscrowReconciliation("job-101"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSynchronized).toBe(true);
    expect(result.current.drifts).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it("sets drifts and false synchronization when drift detected", async () => {
    const mockDrifts = [
      { field: "status", local: "IN_PROGRESS", onChain: "Completed", severity: "CRITICAL" },
    ];

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        isSynchronized: false,
        data: { drifts: mockDrifts },
      }),
    });

    const { result } = renderHook(() => useEscrowReconciliation("job-drifted"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isSynchronized).toBe(false);
    expect(result.current.drifts).toEqual(mockDrifts);
  });

  it("sets error message when API responds with error status", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Escrow job not found" }),
    });

    const { result } = renderHook(() => useEscrowReconciliation("job-404"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Escrow job not found");
  });

  it("re-triggers reconciliation query when sync is called", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, isSynchronized: true, data: { drifts: [] } }),
    });

    const { result } = renderHook(() => useEscrowReconciliation("job-101"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.sync();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
