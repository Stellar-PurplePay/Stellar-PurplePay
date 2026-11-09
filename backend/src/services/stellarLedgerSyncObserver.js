"use strict";

/**
 * Service to observe ledger synchronization drift between backend event indexer
 * and the live Stellar ledger.
 */
class StellarLedgerSyncObserver {
  constructor(options = {}) {
    this.maxDriftTolerance = options.maxDriftTolerance || 5; // ledgers (~25s)
    this.secondsPerLedger = options.secondsPerLedger || 5.0;
  }

  /**
   * Evaluates synchronization status between local indexer cursor and network ledger.
   *
   * @param {number} lastIndexedLedger - The latest ledger processed by local indexer
   * @param {number} currentNetworkLedger - Latest confirmed network ledger sequence
   * @returns {object} Sync diagnosis report
   */
  evaluateSyncState(lastIndexedLedger, currentNetworkLedger) {
    if (!Number.isInteger(lastIndexedLedger) || lastIndexedLedger < 0) {
      throw new Error(`Invalid lastIndexedLedger: ${lastIndexedLedger}`);
    }
    if (!Number.isInteger(currentNetworkLedger) || currentNetworkLedger < 0) {
      throw new Error(`Invalid currentNetworkLedger: ${currentNetworkLedger}`);
    }

    const drift = currentNetworkLedger - lastIndexedLedger;

    if (drift < 0) {
      return {
        status: "clock_skew",
        drift,
        isSynced: false,
        estimatedLagSeconds: 0,
        warning: `Local indexer ledger (${lastIndexedLedger}) is ahead of network ledger (${currentNetworkLedger})`,
      };
    }

    const estimatedLagSeconds = Math.round(drift * this.secondsPerLedger);

    if (drift <= this.maxDriftTolerance) {
      return {
        status: "synced",
        drift,
        isSynced: true,
        estimatedLagSeconds,
        warning: null,
      };
    }

    if (drift <= 50) {
      return {
        status: "catching_up",
        drift,
        isSynced: false,
        estimatedLagSeconds,
        warning: `Indexer is catching up: ${drift} ledgers behind (~${estimatedLagSeconds}s)`,
      };
    }

    return {
      status: "desynchronized",
      drift,
      isSynced: false,
      estimatedLagSeconds,
      warning: `CRITICAL: Indexer is severely desynchronized (${drift} ledgers behind)`,
    };
  }
}

module.exports = new StellarLedgerSyncObserver();
module.exports.StellarLedgerSyncObserver = StellarLedgerSyncObserver;
