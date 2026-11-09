"use strict";

const { StellarLedgerSyncObserver } = require("./stellarLedgerSyncObserver");

describe("stellarLedgerSyncObserver", () => {
  let observer;

  beforeEach(() => {
    observer = new StellarLedgerSyncObserver({ maxDriftTolerance: 5 });
  });

  it("reports synced when drift is within tolerance", () => {
    const report = observer.evaluateSyncState(100_000, 100_003);
    expect(report.status).toBe("synced");
    expect(report.isSynced).toBe(true);
    expect(report.drift).toBe(3);
    expect(report.estimatedLagSeconds).toBe(15);
    expect(report.warning).toBeNull();
  });

  it("reports catching_up when drift is moderate (6-50 ledgers)", () => {
    const report = observer.evaluateSyncState(100_000, 100_020);
    expect(report.status).toBe("catching_up");
    expect(report.isSynced).toBe(false);
    expect(report.drift).toBe(20);
    expect(report.warning).toContain("Indexer is catching up");
  });

  it("reports desynchronized when drift exceeds 50 ledgers", () => {
    const report = observer.evaluateSyncState(100_000, 100_100);
    expect(report.status).toBe("desynchronized");
    expect(report.isSynced).toBe(false);
    expect(report.warning).toContain("CRITICAL: Indexer is severely desynchronized");
  });

  it("flags clock_skew when indexer is ahead of network", () => {
    const report = observer.evaluateSyncState(100_010, 100_000);
    expect(report.status).toBe("clock_skew");
    expect(report.isSynced).toBe(false);
  });
});
