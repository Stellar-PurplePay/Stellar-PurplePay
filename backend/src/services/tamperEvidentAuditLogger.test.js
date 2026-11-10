const {
  TamperEvidentAuditLogger,
  GENESIS_PREVIOUS_HASH,
} = require("./tamperEvidentAuditLogger");

describe("TamperEvidentAuditLogger", () => {
  let logger;

  beforeEach(() => {
    logger = new TamperEvidentAuditLogger();
  });

  it("initializes with valid genesis state", () => {
    const verification = logger.verifyChain();
    expect(verification.isValid).toBe(true);
    expect(verification.length).toBe(0);
    expect(verification.rootHash).toBe(GENESIS_PREVIOUS_HASH);
  });

  it("appends entries and builds cryptographic hash chain", () => {
    const e1 = logger.logAction("ESCROW_CREATED", "GCLIENT1", "job-101", { amount: 5000 });
    expect(e1.index).toBe(0);
    expect(e1.previousHash).toBe(GENESIS_PREVIOUS_HASH);
    expect(e1.hash).toHaveLength(64);

    const e2 = logger.logAction("MILESTONE_RELEASED", "GCLIENT1", "job-101", { milestoneId: 1 });
    expect(e2.index).toBe(1);
    expect(e2.previousHash).toBe(e1.hash);

    const e3 = logger.logAction("DISPUTE_FILED", "GFREELANCER1", "job-102", { reason: "scope" });
    expect(e3.index).toBe(2);
    expect(e3.previousHash).toBe(e2.hash);

    const verification = logger.verifyChain();
    expect(verification.isValid).toBe(true);
    expect(verification.length).toBe(3);
    expect(verification.rootHash).toBe(e3.hash);
  });

  it("detects tampering when an entry payload is mutated", () => {
    logger.logAction("ESCROW_CREATED", "GCLIENT1", "job-101", { amount: 1000 });
    logger.logAction("MILESTONE_RELEASED", "GCLIENT1", "job-101", { amount: 500 });
    logger.logAction("DISPUTE_FILED", "GCLIENT1", "job-101", { reason: "delay" });

    // Verify pristine chain
    expect(logger.verifyChain().isValid).toBe(true);

    // Attacker modifies amount in entry 1
    logger.entries[1].metadata.amount = 999999;

    const tampered = logger.verifyChain();
    expect(tampered.isValid).toBe(false);
    expect(tampered.brokenAtIndex).toBe(1);
    expect(tampered.reason).toContain("Hash integrity failure at entry 1");
  });

  it("detects tampering when an entry is spliced or deleted", () => {
    logger.logAction("E1", "ACTOR1", "job-1");
    logger.logAction("E2", "ACTOR2", "job-2");
    logger.logAction("E3", "ACTOR3", "job-3");

    // Attacker deletes middle entry
    logger.entries.splice(1, 1);

    const tampered = logger.verifyChain();
    expect(tampered.isValid).toBe(false);
    expect(tampered.brokenAtIndex).toBe(1);
  });

  it("filters entries by jobId, actor, and action", () => {
    logger.logAction("CREATE", "ALICE", "job-A", { id: 1 });
    logger.logAction("RELEASE", "ALICE", "job-A", { id: 2 });
    logger.logAction("CREATE", "BOB", "job-B", { id: 3 });

    const jobAEntries = logger.getEntries({ jobId: "job-A" });
    expect(jobAEntries).toHaveLength(2);

    const bobEntries = logger.getEntries({ actor: "BOB" });
    expect(bobEntries).toHaveLength(1);
    expect(bobEntries[0].jobId).toBe("job-B");

    const releaseEntries = logger.getEntries({ action: "RELEASE" });
    expect(releaseEntries).toHaveLength(1);
  });
});

