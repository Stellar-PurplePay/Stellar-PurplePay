const fs = require("fs");
const path = require("path");

describe("OpenAPI Specification Validator", () => {
  const specPath = path.resolve(__dirname, "./openapi.json");

  it("should parse openapi.json and validate OpenAPI 3.1 structure", () => {
    expect(fs.existsSync(specPath)).toBe(true);
    const content = fs.readFileSync(specPath, "utf8");
    const spec = JSON.parse(content);

    expect(spec.openapi).toMatch(/^3\.1\./);
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toContain("Stellar PurplePay");
    expect(spec.paths).toBeDefined();
    expect(spec.components?.schemas).toBeDefined();
  });

  it("should document core endpoints including SEP-0010, Health, and Governance", () => {
    const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

    expect(spec.paths["/health"]).toBeDefined();
    expect(spec.paths["/api/auth/sep10/challenge"]).toBeDefined();
    expect(spec.paths["/api/auth/sep10/token"]).toBeDefined();
    expect(spec.paths["/api/governance/proposals"]).toBeDefined();
    expect(spec.paths["/api/faucet/fund"]).toBeDefined();
  });

  it("should define valid JSON schemas for all component models", () => {
    const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
    const schemas = spec.components.schemas;

    expect(schemas.HealthResponse).toBeDefined();
    expect(schemas.Sep10ChallengeResponse).toBeDefined();
    expect(schemas.Sep10TokenRequest).toBeDefined();
    expect(schemas.Sep10TokenResponse).toBeDefined();
    expect(schemas.Proposal).toBeDefined();
  });
});
