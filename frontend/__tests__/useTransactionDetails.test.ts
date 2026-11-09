import { renderHook, act, waitFor } from "@testing-library/react";
import { useTransactionDetails } from "../hooks/useTransactionDetails";

describe("useTransactionDetails hook", () => {
  const dummyTx = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it("does not fetch when txHash is null or empty", () => {
    const { result } = renderHook(() => useTransactionDetails(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches transaction details successfully", async () => {
    const mockDetails = {
      hash: dummyTx,
      successful: true,
      ledger: 12345,
      feeCharged: { stroops: 100, xlm: "0.0000100" },
      operations: [],
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDetails }),
    });

    const { result } = renderHook(() => useTransactionDetails(dummyTx));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockDetails);
    expect(result.current.error).toBeNull();
  });

  it("sets error message when fetch fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Transaction not found on network" }),
    });

    const { result } = renderHook(() => useTransactionDetails(dummyTx));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Transaction not found on network");
  });

  it("re-executes request when refetch is called", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { hash: dummyTx } }),
    });

    const { result } = renderHook(() => useTransactionDetails(dummyTx));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
