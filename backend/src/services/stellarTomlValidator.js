const StellarSdk = require("@stellar/stellar-sdk");

/**
 * Validates SEP-0001 / SEP-0010 stellar.toml discovery files.
 */
class StellarTomlValidator {
  /**
   * Simple, resilient TOML line-by-line parser for standard stellar.toml key-value pairs.
   */
  static parseToml(rawToml) {
    if (!rawToml || typeof rawToml !== "string") {
      throw new Error("Invalid TOML input: must be a non-empty string");
    }

    const result = {};
    const lines = rawToml.split(/\r?\n/);

    for (let line of lines) {
      line = line.trim();
      // Skip comments and empty lines
      if (!line || line.startsWith("#") || line.startsWith("[")) continue;

      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;

      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();

      // Strip surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      result[key] = val;
    }

    return result;
  }

  /**
   * Validates presence and format of required SEP-0010 fields.
   */
  static validateSep10Fields(tomlObj) {
    const errors = [];

    if (!tomlObj || typeof tomlObj !== "object") {
      return { valid: false, errors: ["Missing TOML object"] };
    }

    // 1. SIGNING_KEY
    if (!tomlObj.SIGNING_KEY) {
      errors.push("Missing required field: SIGNING_KEY");
    } else if (!StellarSdk.StrKey.isValidEd25519PublicKey(tomlObj.SIGNING_KEY)) {
      errors.push("SIGNING_KEY is not a valid Stellar Ed25519 public key");
    }

    // 2. WEB_AUTH_ENDPOINT
    if (!tomlObj.WEB_AUTH_ENDPOINT) {
      errors.push("Missing required field: WEB_AUTH_ENDPOINT");
    } else {
      try {
        const parsedUrl = new URL(tomlObj.WEB_AUTH_ENDPOINT);
        if (
          parsedUrl.protocol !== "https:" &&
          parsedUrl.hostname !== "localhost" &&
          parsedUrl.hostname !== "127.0.0.1"
        ) {
          errors.push("WEB_AUTH_ENDPOINT must use HTTPS protocol (or localhost for dev)");
        }
      } catch (err) {
        errors.push("WEB_AUTH_ENDPOINT is not a valid URL");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      signingKey: tomlObj.SIGNING_KEY,
      webAuthEndpoint: tomlObj.WEB_AUTH_ENDPOINT,
      networkPassphrase: tomlObj.NETWORK_PASSPHRASE || null,
      horizonUrl: tomlObj.HORIZON_URL || null,
    };
  }

  /**
   * Fetches and validates stellar.toml from a domain.
   */
  static async fetchAndValidate(domain, customFetch = fetch) {
    const url = `https://${domain}/.well-known/stellar.toml`;
    const response = await customFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch stellar.toml: HTTP ${response.status}`);
    }
    const text = await response.text();
    const parsed = this.parseToml(text);
    return this.validateSep10Fields(parsed);
  }
}

module.exports = StellarTomlValidator;
