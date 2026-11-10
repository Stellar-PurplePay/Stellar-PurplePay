const ContractLedgerWatchdog = require("./contractLedgerWatchdog");

describe("ContractLedgerWatchdog Service", () => {
  it("should report synchronized when drift is within tolerance", () => {
    const watchdog = new ContractLedgerWatchdog({ maxDriftTolerance: 4 });
    const result = watchdog.assessSynchronization(1000, 1002);

    expect(result.healthy).toBe(true);
    expect(result.status).toBe("synchronized");
    expect(result.drift).toBe(2);
    expect(result.rpcSequence).toBe(1000);
    expect(result.horizonSequence).toBe(1002);
  });

  it("should trigger alertHook and report lagging when drift exceeds tolerance", () => {
    const alertMock = jest.fn();
    const watchdog = new ContractLedgerWatchdog({
      maxDriftTolerance: 5,
      alertHook: alertMock,
    });

    const result = watchdog.assessSynchronization(1000, 1010);

    expect(result.healthy).toBe(false);
    expect(result.status).toBe("lagging");
    expect(result.drift).toBe(10);
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(alertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "lagging",
        drift: 10,
      })
    );
  });

  it("should detect stalled ledger progression across consecutive polls", () => {
    const watchdog = new ContractLedgerWatchdog({ maxDriftTolerance: 5 });

    // Poll 1: normal
    let res = watchdog.assessSynchronization(2000, 2000);
    expect(res.healthy).toBe(true);

    // Poll 2: stalled count 1
    res = watchdog.assessSynchronization(2000, 2000);
    expect(res.healthy).toBe(true);

    // Poll 3: stalled count 2
    res = watchdog.assessSynchronization(2000, 2000);
    expect(res.healthy).toBe(true);

    // Poll 4: stalled count 3 -> triggers stalled status
    res = watchdog.assessSynchronization(2000, 2000);
    expect(res.healthy).toBe(false);
    expect(res.status).toBe("stalled");
  });

  it("should return invalid_metrics for negative or non-numeric inputs", () => {
    const watchdog = new ContractLedgerWatchdog();
    const res = watchdog.assessSynchronization("invalid", -5);

    expect(res.healthy).toBe(false);
    expect(res.status).toBe("invalid_metrics");
  });
});

