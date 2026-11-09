import { renderHook, waitFor } from "@testing-library/react";
import { useStellarNetworkHealth } from "../hooks/useStellarNetworkHealth";

describe("useStellarNetworkHealth hook", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches and sets healthy state for testnet", async () => {
    const mockHealthResponse = {
      status: "healthy",
      sorobanRpc: { latencyMs: 95, latestLedger: 123456 },
      horizon: {
        coreLatestLedger: 123456,
        networkPassphrase: "Test SDF Network ; September 2015",
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockHealthResponse),
    } as any);

    const { result } = renderHook(() => useStellarNetworkHealth(60_000));

    await waitFor(() => {
      expect(result.current.status).toBe("healthy");
    });

    expect(result.current.network).toBe("testnet");
    expect(result.current.latencyMs).toBe(95);
    expect(result.current.latestLedger).toBe(123456);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch failure gracefully by transitioning to unhealthy", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network offline"));

    const { result } = renderHook(() => useStellarNetworkHealth(60_000));

    await waitFor(() => {
      expect(result.current.status).toBe("unhealthy");
    });

    expect(result.current.error).toBe("Network offline");
  });
});
