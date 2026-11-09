"use strict";

const { scValToNative } = require("@stellar/stellar-sdk");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("sorobanEventStream");

class SorobanEventStream {
  /**
   * @param {object} options
   * @param {SorobanRpc.Server} options.server
   * @param {string[]} options.contractIds
   * @param {number} [options.pollIntervalMs=5000]
   * @param {number} [options.batchLimit=50]
   */
  constructor(options = {}) {
    this.server = options.server;
    this.contractIds = options.contractIds || [];
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.batchLimit = options.batchLimit || 50;

    this.cursor = options.initialCursor || null;
    this.seenEventIds = new Set();
    this.maxSeenCache = 10000;
    this.polling = false;
    this.timer = null;
    this.handlers = [];
  }

  /**
   * Attach an event listener callback.
   * @param {Function} handler - (event: object) => void
   */
  onEvent(handler) {
    this.handlers.push(handler);
  }

  /**
   * Safely decodes ScVal XDR or returns raw value if parsing fails.
   */
  static decodeScVal(scVal) {
    if (!scVal) return null;
    try {
      return scValToNative(scVal);
    } catch {
      return scVal;
    }
  }

  /**
   * Normalizes a Soroban RPC event into clean application format.
   * @param {object} rawEvent
   */
  static parseEvent(rawEvent) {
    const topics = (rawEvent.topic || []).map((t) => SorobanEventStream.decodeScVal(t));
    const data = SorobanEventStream.decodeScVal(rawEvent.value);

    return {
      id: rawEvent.id,
      contractId: rawEvent.contractId,
      ledger: rawEvent.ledger,
      ledgerClosedAt: rawEvent.ledgerClosedAt,
      type: rawEvent.type,
      topics,
      data,
    };
  }

  /**
   * Polls the next batch of contract events from Soroban RPC.
   * @returns {Promise<number>} Number of new events processed
   */
  async pollOnce() {
    if (!this.server || typeof this.server.getEvents !== "function") {
      return 0;
    }

    const filters = this.contractIds.length > 0 ? [{ contractIds: this.contractIds }] : [];

    const requestParams = {
      filters,
      limit: this.batchLimit,
    };

    if (this.cursor) {
      requestParams.cursor = this.cursor;
    }

    try {
      const response = await this.server.getEvents(requestParams);
      const events = response.events || [];

      let newCount = 0;
      for (const raw of events) {
        if (this.seenEventIds.has(raw.id)) {
          continue;
        }

        this.seenEventIds.add(raw.id);
        if (this.seenEventIds.size > this.maxSeenCache) {
          const firstSeen = this.seenEventIds.values().next().value;
          this.seenEventIds.delete(firstSeen);
        }

        const parsed = SorobanEventStream.parseEvent(raw);
        for (const handler of this.handlers) {
          try {
            handler(parsed);
          } catch (handlerErr) {
            logger.error({ error: handlerErr.message }, "Event handler threw error");
          }
        }

        this.cursor = raw.pagingToken || raw.id;
        newCount += 1;
      }

      if (response.cursor) {
        this.cursor = response.cursor;
      }

      return newCount;
    } catch (err) {
      logger.error({ error: err.message }, "Error polling Soroban events");
      throw err;
    }
  }

  /**
   * Start polling loop.
   */
  start() {
    if (this.polling) return;
    this.polling = true;

    const loop = async () => {
      if (!this.polling) return;
      try {
        await this.pollOnce();
      } catch {
        // Logged in pollOnce
      }
      if (this.polling) {
        this.timer = setTimeout(loop, this.pollIntervalMs);
      }
    };

    this.timer = setTimeout(loop, 0);
  }

  /**
   * Stop polling loop.
   */
  stop() {
    this.polling = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

module.exports = {
  SorobanEventStream,
};
