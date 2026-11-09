"use strict";

const { SorobanEventStream } = require("./sorobanEventStream");

describe("SorobanEventStream", () => {
  it("parses raw event and notifies listeners", async () => {
    const rawEvents = [
      {
        id: "0000000100-0000000001",
        pagingToken: "token-1",
        contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        ledger: 100,
        ledgerClosedAt: "2026-11-09T20:00:00Z",
        type: "contract",
        topic: ["escrow_funded", "job_123"],
        value: { amount: 500 },
      },
    ];

    const mockServer = {
      getEvents: jest.fn().mockResolvedValue({ events: rawEvents, cursor: "token-1" }),
    };

    const stream = new SorobanEventStream({
      server: mockServer,
      contractIds: ["CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
    });

    const handler = jest.fn();
    stream.onEvent(handler);

    const count = await stream.pollOnce();

    expect(count).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
    const parsed = handler.mock.calls[0][0];
    expect(parsed.id).toBe("0000000100-0000000001");
    expect(parsed.topics).toEqual(["escrow_funded", "job_123"]);
    expect(stream.cursor).toBe("token-1");
  });

  it("deduplicates already processed event IDs", async () => {
    const rawEvents = [
      {
        id: "0000000100-0000000001",
        pagingToken: "token-1",
        contractId: "C123",
        topic: [],
        value: null,
      },
    ];

    const mockServer = {
      getEvents: jest.fn().mockResolvedValue({ events: rawEvents, cursor: "token-1" }),
    };

    const stream = new SorobanEventStream({ server: mockServer });
    const handler = jest.fn();
    stream.onEvent(handler);

    const firstRun = await stream.pollOnce();
    expect(firstRun).toBe(1);

    const secondRun = await stream.pollOnce();
    expect(secondRun).toBe(0);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("starts and stops cleanly without dangling timer", () => {
    const stream = new SorobanEventStream({ server: {} });
    stream.start();
    expect(stream.polling).toBe(true);
    stream.stop();
    expect(stream.polling).toBe(false);
    expect(stream.timer).toBeNull();
  });
});
