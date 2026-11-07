/**
 * src/services/applicationService.js
 *
 * Applications service — owns all reads and writes against the `applications`
 * PostgreSQL table. Handles freelancer proposal submission, validation of
 * screening-question answers, listing applications by job or freelancer, and
 * the atomic "accept one + reject the rest" transition that hires a freelancer.
 *
 * @module services/applicationService
 */
"use strict";

const { calculateFreelancerTier, isBlocked } = require("./profileService");

function encodeApplicationCursor(row) {
  return Buffer.from(JSON.stringify({
    createdAt: row.created_at || row.createdAt,
    id: row.id,
  })).toString("base64url");
}

function decodeApplicationCursor(cursor) {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!decoded.createdAt || !decoded.id) throw new Error("Invalid cursor");
    return decoded;
  } catch {
    const error = new Error("Invalid application cursor");
    error.status = 400;
    throw error;
  }
}

const pool = require("../db/pool");
const { getJob, assignFreelancer } = require("./jobService");
/**
 * Camel-cased application record returned by this service.
 *
 * @typedef {Object} Application
 * @property {string} id                 UUID of the application.
 * @property {string} jobId              UUID of the parent job.
 * @property {string} freelancerAddress  Stellar G-address of the applicant.
 * @property {string} freelancerTier     Computed tier label (see `calculateFreelancerTier`).
 * @property {string} proposal           Cover letter / proposal text (≥50 chars).
 * @property {string} bidAmount          Bid as a fixed-point string (e.g. "450.0000000").
 * @property {("XLM"|"USDC")} currency   Bid currency.
 * @property {("pending"|"accepted"|"rejected")} status
 * @property {Object<string,string>} screeningAnswers  Map of question → answer.
 * @property {string} createdAt          ISO timestamp.
 */

/**
 * Input shape accepted by {@link submitApplication}.
 *
 * @typedef {Object} SubmitApplicationInput
 * @property {string} jobId
 * @property {string} freelancerAddress
 * @property {string} proposal
 * @property {string|number} bidAmount
 * @property {("XLM"|"USDC")} [currency="XLM"]
 * @property {Object<string,string>} [screeningAnswers]  Required only when the parent
 *                                                       job has screening questions.
 */

/**
 * Throws a 400 Error when `key` is not a valid Stellar G-address.
 *
 * @param {string} key  Stellar account public key.
 * @returns {void}
 * @throws {Error}      `status === 400` if the key fails the G-address regex.
 */
function validatePublicKey(key) {
  if (!key || !/^G[A-Z0-9]{55}$/.test(key)) {
    const e = new Error("Invalid Stellar public key");
    e.status = 400;
    throw e;
  }
}

/**
 * Convert a snake_case `applications` row (joined with profile/rating
 * aggregates) into the camelCase API object.
 *
 * @param {Object} row  Raw DB row.
 * @returns {Application}
 */
function rowToApp(row) {
  const completedJobs = row.completed_jobs ?? 0;
  const freelancerRating =
    row.avg_rating !== null && row.avg_rating !== undefined ? parseFloat(row.avg_rating) : null;

  return {
    id: row.id,
    jobId: row.job_id || row.jobId,
    freelancerAddress: row.freelancer_address || row.freelancerAddress,
    freelancerTier: calculateFreelancerTier(completedJobs, freelancerRating),
    proposal: row.proposal,
    bidAmount: row.bid_amount || row.bidAmount,
    currency: row.currency || "XLM",
    status: row.status,
    screeningAnswers: row.screening_answers || row.screeningAnswers || {},
    createdAt: row.created_at || row.createdAt,
    withdrawnAt: row.withdrawn_at || row.withdrawnAt || null,
    bidCommitment: row.bid_commitment || row.bidCommitment || null,
    bidRevealed: Boolean(row.bid_revealed || row.bidRevealed),
    revealedBidAmount: row.revealed_bid_amount || row.revealedBidAmount || null,
  };
}

/**
 * Submit a freelancer's proposal to a job. Inserts a row in `applications`
 * and increments the parent job's `applicant_count`. Returns the new
 * application as a camel-cased {@link Application}.
 *
 * @param {SubmitApplicationInput} input
 * @returns {Promise<Application>}
 */
async function submitApplication({
  jobId,
  freelancerAddress,
  proposal,
  bidAmount,
  currency = "XLM",
  screeningAnswers,
  bidCommitment,
}) {
  validatePublicKey(freelancerAddress);

  const job = await getJob(jobId);

  if (job.status !== "open") {
    const e = new Error("Job is not open for applications");
    e.status = 400;
    throw e;
  }
  if (job.clientAddress === freelancerAddress) {
    const e = new Error("You cannot apply to your own job");
    e.status = 400;
    throw e;
  }
  if (isBlocked && (await isBlocked(job.clientAddress, freelancerAddress))) {
    const e = new Error("This job is not available for applications");
    e.status = 403;
    throw e;
  }
  if (job.visibility === "private") {
    const e = new Error("This job is private and cannot receive applications");
    e.status = 403;
    throw e;
  }
  if (job.visibility === "invite_only") {
    const { rows: inviteRows } = await pool.query(
      "SELECT 1 FROM job_invitations WHERE job_id = $1 AND freelancer_address = $2",
      [jobId, freelancerAddress]
    );
    if (!inviteRows.length) {
      const e = new Error("You are not invited to this job");
      e.status = 403;
      throw e;
    }
  }
  if (!proposal || proposal.length < 50) {
    const e = new Error("Proposal must be at least 50 characters");
    e.status = 400;
    throw e;
  }
  if (!bidAmount || isNaN(parseFloat(bidAmount)) || parseFloat(bidAmount) <= 0) {
    const e = new Error("Bid must be a positive number");
    e.status = 400;
    throw e;
  }

  const screeningQuestions = job.screeningQuestions || job.screening_questions;
  if (screeningQuestions && screeningQuestions.length > 0) {
    if (!screeningAnswers || typeof screeningAnswers !== "object") {
      const e = new Error("Screening answers are required for this job");
      e.status = 400;
      throw e;
    }
    for (const question of screeningQuestions) {
      if (!screeningAnswers[question] || String(screeningAnswers[question]).trim().length === 0) {
        const e = new Error("All screening questions must be answered");
        e.status = 400;
        throw e;
      }
    }
  }

  const safeScreeningAnswers =
    screeningAnswers && typeof screeningAnswers === "object" ? screeningAnswers : {};

  let appRow;
  try {
    const { rows } = await pool.query(
      `INSERT INTO applications (job_id, freelancer_address, proposal, bid_amount, screening_answers, currency, bid_commitment, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
       RETURNING *`,
      [
        jobId,
        freelancerAddress,
        proposal.trim(),
        parseFloat(bidAmount).toFixed(7),
        safeScreeningAnswers,
        currency,
        bidCommitment || null,
      ]
    );
    appRow = rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const e = new Error("You have already applied to this job");
      e.status = 409;
      throw e;
    }
    throw err;
  }

  await pool.query(
    "UPDATE jobs SET applicant_count = applicant_count + 1, updated_at = NOW() WHERE id = $1",
    [jobId]
  );

  return rowToApp(appRow);
}

/**
 * List every application for a given job, oldest first.
 *
 * @param {string} jobId  UUID of the job.
 * @returns {Promise<Application[]>}
 */
async function getApplicationsForJob(jobId, { limit = 20, cursor = null, tier } = {}) {
  const values = [jobId];
  let cursorClause = "";
  if (cursor) {
    const decodedCursor = decodeApplicationCursor(cursor);
    values.push(decodedCursor.createdAt, decodedCursor.id);
    cursorClause = "AND (a.created_at > $2::timestamptz OR (a.created_at = $2::timestamptz AND a.id > $3::uuid))";
  }
  values.push(limit + 1);

  const { rows } = await pool.query(
    `SELECT a.*,
            COALESCE(p.completed_jobs, 0) AS completed_jobs,
            ROUND(AVG(r.stars)::numeric, 2) AS avg_rating
     FROM applications a
     LEFT JOIN profiles p ON p.public_key = a.freelancer_address
     LEFT JOIN ratings r ON r.rated_address = a.freelancer_address
     WHERE a.job_id = $1
     ${cursorClause}
     GROUP BY a.id, p.completed_jobs
     ORDER BY a.created_at ASC, a.id ASC
     LIMIT $${values.length}`,
    values
  );
  let mapped = rows.map(rowToApp);
  if (tier) {
    mapped = mapped.filter((a) => a.freelancerTier === tier);
  }
  const hasNext = mapped.length > limit;
  const page = mapped.slice(0, limit);
  const nextCursor = hasNext ? encodeApplicationCursor(page[page.length - 1]) : null;

  const result = [...page];
  Object.defineProperty(result, "applications", {
    value: page,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(result, "nextCursor", {
    value: nextCursor,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return result;
}

/**
 * List every application submitted by a freelancer, newest first.
 *
 * @param {string} freelancerAddress  Stellar G-address of the freelancer.
 * @returns {Promise<Application[]>}
 */
async function getApplicationsForFreelancer(freelancerAddress) {
  validatePublicKey(freelancerAddress);
  const { rows } = await pool.query(
    `SELECT a.*,
            COALESCE(p.completed_jobs, 0) AS completed_jobs,
            ROUND(AVG(r.stars)::numeric, 2) AS avg_rating
     FROM applications a
     LEFT JOIN profiles p ON p.public_key = a.freelancer_address
     LEFT JOIN ratings r ON r.rated_address = a.freelancer_address
     WHERE a.freelancer_address = $1
     GROUP BY a.id, p.completed_jobs
     ORDER BY a.created_at DESC`,
    [freelancerAddress]
  );
  return rows.map(rowToApp);
}

/**
 * Accept a freelancer's proposal.
 */
async function acceptApplication(applicationId, clientAddress) {
  validatePublicKey(clientAddress);

  const { rows: appRows } = await pool.query("SELECT * FROM applications WHERE id = $1", [applicationId]);
  if (!appRows.length) {
    const e = new Error("Application not found");
    e.status = 404;
    throw e;
  }

  const app = appRows[0];

  const job = await getJob(app.job_id);
  if (job.clientAddress !== clientAddress) {
    const e = new Error("Only the job client can accept applications");
    e.status = 403;
    throw e;
  }
  if (job.status !== "open") {
    const e = new Error("Job is no longer accepting applications");
    e.status = 400;
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: updated } = await client.query(
      "UPDATE applications SET status = 'accepted', accepted_at = NOW() WHERE id = $1 RETURNING *",
      [applicationId]
    );

    await client.query(
      `UPDATE applications
       SET status = 'rejected'
       WHERE job_id = $1 AND id <> $2 AND status = 'pending'`,
      [app.job_id, applicationId]
    );

    await client.query("COMMIT");

    await assignFreelancer(app.job_id, app.freelancer_address);

    return rowToApp(updated[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function withdrawApplication(id, freelancerAddress) {
  validatePublicKey(freelancerAddress);
  const { rows } = await pool.query("SELECT * FROM applications WHERE id = $1", [id]);
  if (!rows.length) {
    const e = new Error("Application not found");
    e.status = 404;
    throw e;
  }
  const app = rows[0];
  if (app.freelancer_address !== freelancerAddress) {
    const e = new Error("Only the freelancer who submitted can withdraw this application");
    e.status = 403;
    throw e;
  }
  if (app.status === "accepted") {
    const e = new Error("Cannot withdraw an already-accepted application");
    e.status = 400;
    throw e;
  }
  const { rows: updated } = await pool.query(
    "UPDATE applications SET withdrawn_at = NOW(), status = 'withdrawn' WHERE id = $1 RETURNING *",
    [id]
  );
  return rowToApp(updated[0] || app);
}

async function closeBiddingForJob(jobId, clientAddress) {
  validatePublicKey(clientAddress);
  const job = await getJob(jobId);
  if (job.clientAddress !== clientAddress) {
    const e = new Error("Only the client can close bidding");
    e.status = 403;
    throw e;
  }
  if (job.status !== "open") {
    const e = new Error("Bidding can only be closed while job is open");
    e.status = 400;
    throw e;
  }
  if (job.biddingClosedAt || job.bidding_closed_at) {
    const e = new Error("Bidding is already closed");
    e.status = 400;
    throw e;
  }
  const { rows } = await pool.query(
    "UPDATE jobs SET bidding_closed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING bidding_closed_at",
    [jobId]
  );
  const biddingClosedAt = rows[0]?.bidding_closed_at || new Date().toISOString();
  return { jobId, biddingClosedAt };
}

async function revealApplicationBid(applicationId, freelancerAddress, bidAmount, nonce) {
  validatePublicKey(freelancerAddress);
  if (!nonce) {
    const e = new Error("Reveal nonce is required");
    e.status = 400;
    throw e;
  }
  if (!bidAmount || isNaN(parseFloat(bidAmount)) || parseFloat(bidAmount) <= 0) {
    const e = new Error("Reveal bid amount must be positive");
    e.status = 400;
    throw e;
  }
  const { rows } = await pool.query("SELECT * FROM applications WHERE id = $1", [applicationId]);
  if (!rows.length) {
    const e = new Error("Application not found");
    e.status = 404;
    throw e;
  }
  const app = rows[0];
  if (app.freelancer_address !== freelancerAddress) {
    const e = new Error("Only the freelancer can reveal this bid");
    e.status = 403;
    throw e;
  }
  const crypto = require("crypto");
  const formattedBid = parseFloat(bidAmount).toFixed(7);
  const expectedHash = crypto.createHash("sha256").update(`${formattedBid}:${nonce}`).digest("hex");
  if (app.bid_commitment !== expectedHash) {
    const e = new Error("Commitment verification failed");
    e.status = 400;
    throw e;
  }
  const { rows: updated } = await pool.query(
    "UPDATE applications SET bid_revealed = true, revealed_bid_amount = $2, revealed_at = NOW() WHERE id = $1 RETURNING *",
    [applicationId, formattedBid]
  );
  const updatedRow = updated[0] || app;
  const result = rowToApp(updatedRow);
  result.bidRevealed = true;
  result.revealedBidAmount = formattedBid;
  return result;
}

async function extendBiddingClose(jobId, clientAddress) {
  validatePublicKey(clientAddress);
  const job = await getJob(jobId);
  if (job.clientAddress !== clientAddress) {
    const e = new Error("Only the job client can extend bidding");
    e.status = 403;
    throw e;
  }
  const currentClosedAt = job.biddingClosedAt || job.bidding_closed_at;
  if (!currentClosedAt) {
    const e = new Error("Bidding has not been closed yet");
    e.status = 400;
    throw e;
  }
  const extendedTime = new Date(new Date(currentClosedAt).getTime() + 10 * 60 * 1000);
  const { rows } = await pool.query(
    "UPDATE jobs SET bidding_closed_at = $1, updated_at = NOW() WHERE id = $2 RETURNING bidding_closed_at",
    [extendedTime.toISOString(), jobId]
  );
  return { jobId, biddingClosedAt: rows[0]?.bidding_closed_at || extendedTime.toISOString() };
}

async function bulkUpdateApplications({ applicationIds, action, clientAddress }) {
  validatePublicKey(clientAddress);
  if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
    const e = new Error("applicationIds must be a non-empty array");
    e.status = 400;
    throw e;
  }
  if (!["shortlist", "reject"].includes(action)) {
    const e = new Error("Invalid action");
    e.status = 400;
    throw e;
  }
  for (const id of applicationIds) {
    const { rows } = await pool.query("SELECT * FROM applications WHERE id = $1", [id]);
    if (rows.length) {
      const job = await getJob(rows[0].job_id);
      if (job.clientAddress !== clientAddress) {
        const e = new Error("Only the job client can update applications");
        e.status = 403;
        throw e;
      }
    }
  }
  const targetStatus = action === "shortlist" ? "shortlisted" : "rejected";
  const { rows } = await pool.query(
    "UPDATE applications SET status = $1 WHERE id = ANY($2::uuid[]) RETURNING *",
    [targetStatus, applicationIds]
  );
  return {
    updatedCount: rows.length,
    status: targetStatus,
    applications: rows.map(rowToApp),
  };
}

async function updateStatus(applicationId, newStatus, changedBy) {
  if (!['pending', 'shortlisted', 'accepted', 'rejected'].includes(newStatus)) {
    const e = new Error('Invalid application status'); e.status = 400; throw e;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, status FROM applications WHERE id = $1 FOR UPDATE', [applicationId],
    );
    if (!rows.length) { const e = new Error('Application not found'); e.status = 404; throw e; }
    const oldStatus = rows[0].status;
    await client.query('UPDATE applications SET status = $1 WHERE id = $2', [newStatus, applicationId]);
    await client.query(
      `INSERT INTO application_status_history (application_id, old_status, new_status, changed_by)
       VALUES ($1, $2, $3, $4)`, [applicationId, oldStatus, newStatus, changedBy || null],
    );
    await client.query('COMMIT');
    const { rows: updated } = await pool.query('SELECT * FROM applications WHERE id = $1', [applicationId]);
    return rowToApp(updated[0]);
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function getApplicationStatusHistory(applicationId) {
  const { rows: appRows } = await pool.query('SELECT id FROM applications WHERE id = $1', [applicationId]);
  if (!appRows.length) { const e = new Error('Application not found'); e.status = 404; throw e; }
  const { rows } = await pool.query(
    `SELECT id, application_id AS "applicationId", old_status AS "oldStatus",
            new_status AS "newStatus", changed_by AS "changedBy", changed_at AS "changedAt"
     FROM application_status_history WHERE application_id = $1 ORDER BY changed_at ASC`, [applicationId],
  );
  return rows;
}

module.exports = {
  submitApplication,
  getApplicationsForJob,
  getApplicationsForFreelancer,
  acceptApplication,
  withdrawApplication,
  closeBiddingForJob,
  revealApplicationBid,
  extendBiddingClose,
  bulkUpdateApplications,
  updateStatus,
  getApplicationStatusHistory,
};
