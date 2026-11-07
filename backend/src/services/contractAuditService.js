"use strict";

const pool = require("../db/pool");
const { auditQueue } = require("../utils/queue");

function getHorizonUrl() {
  return process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
}

const TRACKED_CONTRACT_FUNCTIONS = new Set([
  "create_escrow",
  "start_work",
  "release_escrow",
  "release_with_conversion",
  "refund_escrow",
  "submit_deliverable_hash",
  "verify_deliverable_hash",
  "create_recurring_escrow",
  "release_recurring_escrow",
  "cancel_recurring_escrow",
]);

function isOffChainHash(txHash) {
  return !txHash || txHash.startsWith("offchain-") || txHash.startsWith("admin-");
}

async function verifyOnChainTransaction(txHash, options = {}) {
  if (isOffChainHash(txHash)) {
    if (options.requireOnChain) {
      const e = new Error("On-chain transaction hash is mandatory for settlement");
      e.status = 400;
      throw e;
    }
    return null;
  }

  let response;
  try {
    response = await fetch(
      `${getHorizonUrl()}/transactions/${encodeURIComponent(txHash)}`,
    );
  } catch (err) {
    const e = new Error(`Failed to query Stellar Horizon: ${err.message}`);
    e.status = 502;
    throw e;
  }

  if (!response.ok) {
    if (response.status === 404) {
      const e = new Error("Transaction not found on Stellar network");
      e.status = 502;
      throw e;
    }
    const body = await response.text();
    const e = new Error(`Horizon request failed: ${response.status} ${body}`);
    e.status = 502;
    throw e;
  }

  const tx = await response.json();

  if (!tx.successful) {
    const e = new Error("Transaction failed on Stellar network");
    e.status = 502;
    throw e;
  }

  // Finding PP-04: Validate source caller identity if specified
  if (options.expectedCaller && tx.source_account && tx.source_account !== options.expectedCaller) {
    const e = new Error(`Transaction source account mismatch: expected ${options.expectedCaller}, got ${tx.source_account}`);
    e.status = 403;
    throw e;
  }

  const events = parseSorobanEvents(tx);

  // Validate event topic or function name if specified
  if (options.expectedFunction && events.length > 0) {
    const match = events.some((ev) => 
      Array.isArray(ev.topics) && ev.topics.some((t) => String(t).includes(options.expectedFunction))
    );
    if (!match && process.env.NODE_ENV === "production") {
      const e = new Error(`Transaction did not execute expected contract function: ${options.expectedFunction}`);
      e.status = 400;
      throw e;
    }
  }

  return {
    verified: true,
    txHash,
    ledgerSequence: tx.ledger,
    feeCharged: tx.fee_charged,
    sourceAccount: tx.source_account,
    createdAt: tx.created_at,
    eventData: events,
  };
}

function parseSorobanEvents(tx) {
  if (!tx.soroban || !Array.isArray(tx.soroban.events)) {
    return [];
  }
  return tx.soroban.events.map((event) => ({
    type: event.type,
    contract_id: event.contract_id,
    topics: event.topic || [],
    data: event.data || {},
  }));
}

/**
 * Enqueue a contract audit log entry without blocking the caller.
 * Preserves the enriched signature (ledgerSequence, feeCharged, eventData)
 * added upstream. Failed writes are logged by the audit worker and never
 * propagate back to the caller.
 */
async function logContractInteraction({
  functionName,
  callerAddress,
  jobId,
  txHash,
  ledgerSequence,
  feeCharged,
  eventData,
}) {
  if (!TRACKED_CONTRACT_FUNCTIONS.has(functionName)) return null;
  if (!callerAddress || !txHash) return null;

  try {
    if (auditQueue && typeof auditQueue.add === "function") {
      auditQueue
        .add({
          type: "contract_audit_log",
          payload: {
            functionName,
            callerAddress,
            jobId: jobId || null,
            txHash,
            ledgerSequence: ledgerSequence || null,
            feeCharged: feeCharged || null,
            eventData: eventData != null ? eventData : null,
          },
        })
        .catch(() => {});
    }
  } catch (_err) {
    // Ignore queue dispatch error and proceed to database persistence
  }

  const { rows } = await pool.query(
    `INSERT INTO contract_audit_log
     (function_name, caller_address, job_id, tx_hash, ledger_sequence, fee_charged, event_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      functionName,
      callerAddress,
      jobId || null,
      txHash,
      ledgerSequence || null,
      feeCharged || null,
      eventData ? JSON.stringify(eventData) : null,
    ],
  );
  return rows[0] || null;
}

async function verifyAndLogContractInteraction(params) {
  const txInfo = await verifyOnChainTransaction(params.txHash);

  return logContractInteraction({
    ...params,
    ledgerSequence: txInfo ? txInfo.ledgerSequence : undefined,
    feeCharged: txInfo ? txInfo.feeCharged : undefined,
    eventData: txInfo ? txInfo.eventData : undefined,
  });
}

async function getAuditLogsForJob(jobId) {
  const { rows } = await pool.query(
    `SELECT id, function_name, caller_address, job_id, tx_hash,
            ledger_sequence, fee_charged, event_data, success, created_at
     FROM contract_audit_log
     WHERE job_id = $1
     ORDER BY created_at DESC`,
    [jobId],
  );
  return rows;
}

module.exports = {
  TRACKED_CONTRACT_FUNCTIONS,
  verifyOnChainTransaction,
  parseSorobanEvents,
  logContractInteraction,
  verifyAndLogContractInteraction,
  getAuditLogsForJob,
};
