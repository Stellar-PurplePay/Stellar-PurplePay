"use strict";

const { AlertDispatcher, SEVERITY } = require("./alertDispatcher");

describe("AlertDispatcher", () => {
  it("formats and dispatches Slack alert successfully", async () => {
    let capturedBody = null;
    const mockFetch = jest.fn().mockImplementation((url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ ok: true, status: 200 });
    });

    const dispatcher = new AlertDispatcher({
      webhookUrl: "https://hooks.slack.com/services/T00/B00/X00",
      channelType: "slack",
      fetchFn: mockFetch,
    });

    const res = await dispatcher.dispatchAlert({
      title: "Escrow Frozen",
      message: "Admin triggered circuit breaker",
      severity: SEVERITY.CRITICAL,
      metadata: { jobId: "job-999" },
    });

    expect(res.sent).toBe(true);
    expect(capturedBody.attachments[0].color).toBe("#e11d48"); // Red for critical
    expect(capturedBody.attachments[0].blocks[0].text.text).toContain("[CRITICAL] Escrow Frozen");
  });

  it("formats and dispatches Discord alert successfully", async () => {
    let capturedBody = null;
    const mockFetch = jest.fn().mockImplementation((url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return Promise.resolve({ ok: true, status: 204 });
    });

    const dispatcher = new AlertDispatcher({
      webhookUrl: "https://discord.com/api/webhooks/123/abc",
      channelType: "discord",
      fetchFn: mockFetch,
    });

    const res = await dispatcher.dispatchAlert({
      title: "Rate Limit Warning",
      message: "Traffic surge on Horizon stream",
      severity: SEVERITY.WARNING,
    });

    expect(res.sent).toBe(true);
    expect(capturedBody.content).toContain("[WARNING] Rate Limit Warning");
    expect(capturedBody.embeds[0].color).toBe(0xf59e0b); // Amber for warning
  });

  it("throttles duplicate alerts within window", async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const dispatcher = new AlertDispatcher({
      webhookUrl: "https://hooks.slack.com/test",
      throttleWindowMs: 10000,
      fetchFn: mockFetch,
    });

    const res1 = await dispatcher.dispatchAlert({
      title: "RPC Spike",
      message: "High latency detected",
    });
    expect(res1.sent).toBe(true);

    const res2 = await dispatcher.dispatchAlert({
      title: "RPC Spike",
      message: "High latency detected",
    });
    expect(res2.sent).toBe(false);
    expect(res2.reason).toBe("ALERT_THROTTLED");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns sent: false when webhook is unconfigured", async () => {
    const dispatcher = new AlertDispatcher({ webhookUrl: "" });
    const res = await dispatcher.dispatchAlert({ title: "Test", message: "Test" });
    expect(res.sent).toBe(false);
    expect(res.reason).toBe("WEBHOOK_URL_NOT_CONFIGURED");
  });
});

