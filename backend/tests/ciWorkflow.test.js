const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

describe("CI Workflow Configuration Validator", () => {
  const ciFilePath = path.resolve(__dirname, "../../.github/workflows/ci.yml");

  it("should locate and parse ci.yml as valid YAML", () => {
    expect(fs.existsSync(ciFilePath)).toBe(true);
    const raw = fs.readFileSync(ciFilePath, "utf8");
    const doc = YAML.parse(raw);
    expect(doc).toBeDefined();
    expect(doc.name).toBe("CI");
  });

  it("should configure matrix testing for backend and frontend jobs", () => {
    const raw = fs.readFileSync(ciFilePath, "utf8");
    const doc = YAML.parse(raw);

    const backend = doc.jobs.backend;
    expect(backend).toBeDefined();
    expect(backend.strategy?.matrix?.["node-version"]).toEqual(
      expect.arrayContaining([18, 20])
    );

    const frontend = doc.jobs.frontend;
    expect(frontend).toBeDefined();
    expect(frontend.strategy?.matrix?.["node-version"]).toEqual(
      expect.arrayContaining([18, 20])
    );
  });

  it("should specify wasm32v1-none compilation for Soroban smart contracts", () => {
    const raw = fs.readFileSync(ciFilePath, "utf8");
    const doc = YAML.parse(raw);

    const contracts = doc.jobs.contracts;
    expect(contracts).toBeDefined();

    const toolchainStep = contracts.steps.find((s) =>
      s.uses?.includes("dtolnay/rust-toolchain")
    );
    expect(toolchainStep).toBeDefined();
    expect(toolchainStep.with?.targets).toContain("wasm32v1-none");
  });

  it("should define comprehensive pipeline jobs including security audits", () => {
    const raw = fs.readFileSync(ciFilePath, "utf8");
    const doc = YAML.parse(raw);

    expect(doc.jobs).toHaveProperty("backend");
    expect(doc.jobs).toHaveProperty("frontend");
    expect(doc.jobs).toHaveProperty("contracts");
    expect(doc.jobs).toHaveProperty("e2e");
    expect(doc.jobs).toHaveProperty("security");
  });
});

