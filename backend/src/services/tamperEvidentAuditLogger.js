const crypto = require("crypto");

const GENESIS_PREVIOUS_HASH = "0".repeat(64);

class TamperEvidentAuditLogger {
  constructor() {
    this.entries = [];
  }

  calculateHash(index, timestamp, action, actor, jobId, metadata, previousHash) {
    const payload = `${index}:${timestamp}:${action}:${actor}:${jobId || ""}:${JSON.stringify(
      metadata || {}
    )}:${previousHash}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  logAction(action, actor, jobId = null, metadata = {}) {
    const index = this.entries.length;
    const timestamp = Date.now();
    const previousHash =
      index === 0 ? GENESIS_PREVIOUS_HASH : this.entries[index - 1].hash;

    const hash = this.calculateHash(
      index,
      timestamp,
      action,
      actor,
      jobId,
      metadata,
      previousHash
    );

    const entry = {
      index,
      timestamp,
      action,
      actor,
      jobId,
      metadata,
      previousHash,
      hash,
    };

    this.entries.push(entry);
    return entry;
  }

  verifyChain() {
    if (this.entries.length === 0) {
      return { isValid: true, length: 0, rootHash: GENESIS_PREVIOUS_HASH };
    }

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // Check index continuity
      if (entry.index !== i) {
        return { isValid: false, brokenAtIndex: i, reason: "Index sequence discontinuity" };
      }

      // Check previousHash pointer
      const expectedPrevHash = i === 0 ? GENESIS_PREVIOUS_HASH : this.entries[i - 1].hash;
      if (entry.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          brokenAtIndex: i,
          reason: `Previous hash mismatch: expected ${expectedPrevHash}, got ${entry.previousHash}`,
        };
      }

      // Recalculate hash to verify contents were not modified
      const recomputedHash = this.calculateHash(
        entry.index,
        entry.timestamp,
        entry.action,
        entry.actor,
        entry.jobId,
        entry.metadata,
        entry.previousHash
      );

      if (entry.hash !== recomputedHash) {
        return {
          isValid: false,
          brokenAtIndex: i,
          reason: `Hash integrity failure at entry ${i}`,
        };
      }
    }

    return {
      isValid: true,
      length: this.entries.length,
      rootHash: this.entries[this.entries.length - 1].hash,
    };
  }

  getEntries(filter = {}) {
    let result = [...this.entries];
    if (filter.jobId) {
      result = result.filter((e) => e.jobId === filter.jobId);
    }
    if (filter.actor) {
      result = result.filter((e) => e.actor === filter.actor);
    }
    if (filter.action) {
      result = result.filter((e) => e.action === filter.action);
    }
    if (filter.limit && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }
    return result;
  }

  getLatestHash() {
    return this.entries.length > 0
      ? this.entries[this.entries.length - 1].hash
      : GENESIS_PREVIOUS_HASH;
  }

  clear() {
    this.entries = [];
  }
}

const defaultAuditLogger = new TamperEvidentAuditLogger();

module.exports = {
  TamperEvidentAuditLogger,
  defaultAuditLogger,
  GENESIS_PREVIOUS_HASH,
};
