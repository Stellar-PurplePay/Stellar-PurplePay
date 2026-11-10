/**
 * ContractLedgerWatchdog
 * Monitors synchronization health between Soroban RPC and Stellar Horizon nodes,
 * tracking sequence drift, stalled ledgers, and network partitioning.
 */
class ContractLedgerWatchdog {
  constructor(options = {}) {
    this.maxDriftTolerance = options.maxDriftTolerance || 5;
    this.alertHook = options.alertHook || null;
    this.lastObservedRpcLedger = null;
    this.lastObservedHorizonLedger = null;
    this.stalledCounter = 0;
  }

  /**
   * Assesses health given latest sequence numbers from RPC and Horizon.
   */
  assessSynchronization(rpcSequence, horizonSequence) {
    const rpcSeq = Number(rpcSequence);
    const horizonSeq = Number(horizonSequence);

    if (isNaN(rpcSeq) || isNaN(horizonSeq) || rpcSeq <= 0 || horizonSeq <= 0) {
      return {
        healthy: false,
        status: "invalid_metrics",
        error: "Sequence numbers must be positive integers",
      };
    }

    const drift = Math.abs(rpcSeq - horizonSeq);
    let status = "synchronized";
    let healthy = true;

    // Detect stall (no advancement while polling)
    if (
      this.lastObservedRpcLedger === rpcSeq &&
      this.lastObservedHorizonLedger === horizonSeq
    ) {
      this.stalledCounter += 1;
      if (this.stalledCounter >= 3) {
        status = "stalled";
        healthy = false;
      }
    } else {
      this.stalledCounter = 0;
    }

    this.lastObservedRpcLedger = rpcSeq;
    this.lastObservedHorizonLedger = horizonSeq;

    if (status !== "stalled" && drift > this.maxDriftTolerance) {
      status = "lagging";
      healthy = false;
    }

    const assessment = {
      healthy,
      status,
      rpcSequence: rpcSeq,
      horizonSequence: horizonSeq,
      drift,
      tolerance: this.maxDriftTolerance,
      timestamp: new Date().toISOString(),
    };

    if (!healthy && typeof this.alertHook === "function") {
      try {
        this.alertHook(assessment);
      } catch (err) {
        // Safe alert fallback
      }
    }

    return assessment;
  }
}

module.exports = ContractLedgerWatchdog;

