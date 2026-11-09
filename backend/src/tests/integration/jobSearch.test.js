/**
 * Integration tests for full-text job search (Issue #773)
 *
 * Tests: GET /api/jobs?search= with tsvector @@ to_tsquery,
 * ts_rank ordering, and ts_headline highlights.
 *
 * Uses Supertest against real Express app + test PostgreSQL DB.
 * Transactions rolled back between tests for isolation.
 */

"use strict";

const request = require("supertest");
const { Pool } = require("pg");
const app = require("../../server");

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

let pool;
let hasPostgres = false;

const SEED_TITLES = [
  "Senior Rust Developer for Blockchain Project",
  "React Frontend Engineer Needed",
  "Build a Soroban Smart Contract",
  "Full Stack Developer for API Integration",
];

beforeAll(async () => {
  try {
    pool = new Pool({
      connectionString: TEST_DATABASE_URL,
      connectionTimeoutMillis: 1500,
    });
    await pool.query("SELECT 1");
    hasPostgres = true;
  } catch (err) {
    console.warn("PostgreSQL not available, skipping jobSearch integration tests.", err.message);
    hasPostgres = false;
  }
});

afterAll(async () => {
  if (pool && hasPostgres) {
    await pool.end().catch(() => {});
  }
});

describe("GET /api/jobs?search= — full-text search", () => {
  const clientAddress = "G" + "A".repeat(55);

  beforeAll(async () => {
    if (!hasPostgres) return;
    await pool.query(
      `INSERT INTO profiles (public_key, display_name, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (public_key) DO UPDATE SET display_name = EXCLUDED.display_name`,
      [clientAddress, "Search Test Client", "client"]
    );
  });

  beforeEach(async () => {
    if (!hasPostgres) return;
    await pool.query(
      `INSERT INTO jobs (title, description, budget, currency, category, status, client_address, search_vector)
       VALUES
         ($1, $2, 100, 'XLM', 'Backend Development', 'open', $3,
          to_tsvector('english', $1 || ' ' || $2)),
         ($4, $5, 200, 'XLM', 'Frontend Development', 'open', $3,
          to_tsvector('english', $4 || ' ' || $5)),
         ($6, $7, 300, 'XLM', 'Smart Contracts', 'open', $3,
          to_tsvector('english', $6 || ' ' || $7)),
         ($8, $9, 400, 'XLM', 'Backend Development', 'open', $3,
          to_tsvector('english', $8 || ' ' || $9))`,
      [
        SEED_TITLES[0],
        "We need an experienced Rust developer to build a high-performance blockchain indexing service using Soroban and PostgreSQL.",
        clientAddress,
        "React Frontend Engineer Needed",
        "Looking for a skilled React developer to build a responsive dashboard with real-time data visualizations using D3.js.",
        "Build a Soroban Smart Contract",
        "Develop and audit a Soroban smart contract for an escrow system with milestone-based payment release.",
        SEED_TITLES[3],
        "Need a developer to integrate REST APIs and build backend services with Node.js and PostgreSQL.",
      ]
    );
  });

  afterEach(async () => {
    if (!hasPostgres) return;
    await pool.query("DELETE FROM jobs WHERE title = ANY($1)", [SEED_TITLES]).catch(() => {});
  });

  test("returns jobs matching a single search term", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?search=rust");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((job) => job.title.toLowerCase().includes("rust"))).toBe(true);
  });

  test("returns ranked jobs for q full-text queries", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?q=react+developer");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].title).toMatch(/React/i);
  });

  test("returns jobs matching multiple search terms", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?search=soroban+contract");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      res.body.data.some((job) => job.title.includes("Soroban Smart Contract"))
    ).toBe(true);
  });

  test("returns search headlines when search term is provided", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?search=developer");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const matchedJobs = res.body.data.filter(
      (job) => job.searchHeadline || job.descriptionHeadline
    );
    expect(matchedJobs.length).toBeGreaterThanOrEqual(1);

    const firstWithHeadline = res.body.data.find((job) => job.searchHeadline);
    if (firstWithHeadline) {
      expect(firstWithHeadline.searchHeadline).toMatch(/<mark>/);
    }
  });

  test("ranks results by relevance (ts_rank)", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?search=rust+developer+blockchain");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    if (res.body.data.length >= 1) {
      const firstJob = res.body.data[0];
      expect(firstJob.title).toMatch(/Rust/i);
    }
  });

  test("returns empty array for unmatched search term", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?search=zzzxyznonexistentterm999");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  test("handles empty search parameter gracefully", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?search=");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test("handles special characters in search safely", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?search=DROP+TABLE");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("combines search with status filter", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get("/api/jobs?search=developer&status=open");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.every((job) => job.status === "open")).toBe(true);
  });

  test("combines search with category filter", async () => {
    if (!hasPostgres) {
      console.log("Skipping test: no Postgres instance.");
      return;
    }
    const res = await request(app).get(
      "/api/jobs?search=contract&category=Smart+Contracts"
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(
      res.body.data.every((job) => job.category === "Smart Contracts")
    ).toBe(true);
  });
});
