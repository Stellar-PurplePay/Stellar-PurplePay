const StellarSdk = require("@stellar/stellar-sdk");
const StellarTomlValidator = require("./stellarTomlValidator");

describe("StellarTomlValidator Service", () => {
  const validSigningKey = StellarSdk.Keypair.random().publicKey();

  it("should parse standard stellar.toml key-value pairs ignoring comments and quotes", () => {
    const raw = `
      # Stellar TOML Configuration
      VERSION="2.0.0"
      SIGNING_KEY="${validSigningKey}"
      WEB_AUTH_ENDPOINT="https://auth.example.com/api/auth/sep10"
      NETWORK_PASSPHRASE='Test SDF Network ; September 2015'
    `;

    const parsed = StellarTomlValidator.parseToml(raw);
    expect(parsed.VERSION).toBe("2.0.0");
    expect(parsed.SIGNING_KEY).toBe(validSigningKey);
    expect(parsed.WEB_AUTH_ENDPOINT).toBe("https://auth.example.com/api/auth/sep10");
    expect(parsed.NETWORK_PASSPHRASE).toBe("Test SDF Network ; September 2015");
  });

  it("should validate compliant SEP-0010 configuration", () => {
    const tomlObj = {
      SIGNING_KEY: validSigningKey,
      WEB_AUTH_ENDPOINT: "https://auth.stellar-purplepay.org/sep10",
      NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    };

    const res = StellarTomlValidator.validateSep10Fields(tomlObj);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.signingKey).toBe(validSigningKey);
    expect(res.webAuthEndpoint).toBe("https://auth.stellar-purplepay.org/sep10");
  });

  it("should detect invalid signing key and insecure HTTP endpoint", () => {
    const tomlObj = {
      SIGNING_KEY: "INVALID_G_KEY",
      WEB_AUTH_ENDPOINT: "http://insecure-domain.com/auth",
    };

    const res = StellarTomlValidator.validateSep10Fields(tomlObj);
    expect(res.valid).toBe(false);
    expect(res.errors).toHaveLength(2);
    expect(res.errors.some((e) => e.includes("SIGNING_KEY"))).toBe(true);
    expect(res.errors.some((e) => e.includes("HTTPS"))).toBe(true);
  });
});
