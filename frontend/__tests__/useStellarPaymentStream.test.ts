import { renderHook, act } from "@testing-library/react";
import { useStellarPaymentStream, StreamPayment } from "../hooks/useStellarPaymentStream";

class MockEventSource {
  public url: string;
  public onmessage: ((e: any) => void) | null = null;
  public onerror: ((e: any) => void) | null = null;
  private listeners: Record<string, ((e: any) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.dispatchEvent("connected", { data: JSON.stringify({ status: "connected" }) });
    }, 10);
  }

  public addEventListener(type: string, listener: (e: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  public dispatchEvent(type: string, event: any) {
    if (this.listeners[type]) {
      this.listeners[type].forEach((cb) => cb(event));
    }
  }

  public close() {
    this.listeners = {};
  }
}

describe("useStellarPaymentStream", () => {
  const validAddress = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  let originalEventSource: any;

  beforeEach(() => {
    originalEventSource = global.EventSource;
    (global as any).EventSource = MockEventSource;
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
  });

  it("does not connect if accountAddress is invalid or omitted", () => {
    const { result } = renderHook(() =>
      useStellarPaymentStream({ accountAddress: null })
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.payments).toEqual([]);
  });

  it("connects and receives streamed payment messages", async () => {
    const handlePayment = jest.fn();
    let currentEventSource: MockEventSource | null = null;

    (global as any).EventSource = function (url: string) {
      currentEventSource = new MockEventSource(url);
      return currentEventSource;
    };

    const { result } = renderHook(() =>
      useStellarPaymentStream({
        accountAddress: validAddress,
        onPayment: handlePayment,
      })
    );

    // Wait for connection event
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(result.current.isConnected).toBe(true);

    const dummyPayment: StreamPayment = {
      id: "pay_100",
      type: "payment",
      from: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      to: validAddress,
      amount: "250.0",
      asset: "XLM",
      txHash: "hash_123",
      createdAt: "2026-11-09T22:00:00Z",
    };

    act(() => {
      if (currentEventSource && currentEventSource.onmessage) {
        currentEventSource.onmessage({ data: JSON.stringify(dummyPayment) });
      }
    });

    expect(result.current.lastPayment).toEqual(dummyPayment);
    expect(result.current.payments).toHaveLength(1);
    expect(handlePayment).toHaveBeenCalledWith(dummyPayment);

    // Test clearPayments
    act(() => {
      result.current.clearPayments();
    });
    expect(result.current.payments).toEqual([]);
    expect(result.current.lastPayment).toBeNull();
  });
});
