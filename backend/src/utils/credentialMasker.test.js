"use strict";

const {
  maskString,
  maskObject,
  maskHeaders,
  maskUrl,
} = require("./credentialMasker");

describe("credentialMasker", () => {
  const validStellarSecret = "SCZANGBA5YHTNYVVV4C3U252E2B6P6OGVU7EQ7W5KZMG4DKXMBNWB6DH";

  describe("maskString", () => {
    it("should mask Stellar secret keys", () => {
      const message = `Connecting with secret seed: ${validStellarSecret} to submit payment`;
      const masked = maskString(message);
      expect(masked).not.toContain(validStellarSecret);
      expect(masked).toContain("[REDACTED_STELLAR_SECRET_KEY]");
    });

    it("should mask PEM private keys", () => {
      const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y1...\n-----END RSA PRIVATE KEY-----";
      const message = `Loaded server key:\n${pem}`;
      const masked = maskString(message);
      expect(masked).not.toContain("MIIEowIBAAKCAQEA0Y1");
      expect(masked).toContain("[REDACTED_PRIVATE_KEY]");
    });

    it("should mask Bearer tokens", () => {
      const auth = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature";
      const masked = maskString(`Request failed with header: ${auth}`);
      expect(masked).toContain("Bearer [REDACTED_BEARER_TOKEN]");
      expect(masked).not.toContain("doNotLeakThisSignature");
    });

    it("should handle non-string values gracefully", () => {
      expect(maskString(12345)).toBe(12345);
      expect(maskString(null)).toBeNull();
      expect(maskString(undefined)).toBeUndefined();
    });
  });

  describe("maskObject", () => {
    it("should redact sensitive fields in an object", () => {
      const input = {
        username: "alice",
        password: "SuperSecretPassword123!",
        apiKey: "pk_live_1234567890abcdef",
        nested: {
          secret: "hidden-value",
          normal: "visible-value",
        },
      };

      const result = maskObject(input);
      expect(result.username).toBe("alice");
      expect(result.password).toBe("[REDACTED]");
      expect(result.apiKey).toBe("[REDACTED]");
      expect(result.nested.secret).toBe("[REDACTED]");
      expect(result.nested.normal).toBe("visible-value");
    });

    it("should scrub embedded secrets in strings inside arrays", () => {
      const input = ["safe", `Seed: ${validStellarSecret}`];
      const result = maskObject(input);
      expect(result[0]).toBe("safe");
      expect(result[1]).toContain("[REDACTED_STELLAR_SECRET_KEY]");
    });

    it("should prevent infinite loops with circular references", () => {
      const circular = { name: "loop" };
      circular.self = circular;
      const result = maskObject(circular);
      expect(result.name).toBe("loop");
      expect(result.self).toBe("[CIRCULAR_REFERENCE]");
    });

    it("should truncate deeply nested structures beyond max depth", () => {
      let current = {};
      const root = current;
      for (let i = 0; i < 12; i++) {
        current.child = {};
        current = current.child;
      }
      const result = maskObject(root);
      let depth = 0;
      let node = result;
      while (node && typeof node === "object" && node.child) {
        depth++;
        node = node.child;
      }
      expect(node).toBe("[MAX_DEPTH_REACHED]");
      expect(depth).toBeLessThanOrEqual(9);
    });
  });

  describe("maskHeaders", () => {
    it("should redact authorization and secret headers", () => {
      const headers = {
        "content-type": "application/json",
        authorization: "Bearer secret-token",
        "x-api-key": "secret-api-key",
        cookie: "session=xyz123",
      };

      const cleaned = maskHeaders(headers);
      expect(cleaned["content-type"]).toBe("application/json");
      expect(cleaned.authorization).toBe("[REDACTED]");
      expect(cleaned["x-api-key"]).toBe("[REDACTED]");
      expect(cleaned.cookie).toBe("[REDACTED]");
    });

    it("should handle empty or null headers", () => {
      expect(maskHeaders(null)).toEqual({});
      expect(maskHeaders(undefined)).toEqual({});
    });
  });

  describe("maskUrl", () => {
    it("should redact passwords in basic auth URLs", () => {
      const url = "https://user:supersecret@stellar-node.org/api/v1";
      const masked = maskUrl(url);
      expect(masked).toBe("https://user:%5BREDACTED%5D@stellar-node.org/api/v1");
    });

    it("should redact sensitive query parameters in URLs", () => {
      const url = "https://api.example.com/webhook?token=secret123&apiKey=key999&name=bob";
      const masked = maskUrl(url);
      expect(masked).toContain("token=%5BREDACTED%5D");
      expect(masked).toContain("apiKey=%5BREDACTED%5D");
      expect(masked).toContain("name=bob");
    });
  });
});
