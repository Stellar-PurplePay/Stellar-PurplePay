const {
  extractClientIp,
  anonymizeIp,
  hashIp,
  ipAnonymizerMiddleware,
} = require("./ipAnonymizer");

describe("ipAnonymizer", () => {
  describe("anonymizeIp", () => {
    it("masks last octet of IPv4 addresses", () => {
      expect(anonymizeIp("198.51.100.42")).toBe("198.51.100.0");
      expect(anonymizeIp("10.0.0.1")).toBe("10.0.0.0");
    });

    it("strips IPv6 mapped IPv4 prefix and masks", () => {
      expect(anonymizeIp("::ffff:192.0.2.128")).toBe("192.0.2.0");
    });

    it("masks IPv6 addresses keeping first 3 segments", () => {
      expect(anonymizeIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:0db8:85a3::0");
    });

    it("handles null or invalid input gracefully", () => {
      expect(anonymizeIp(null)).toBe("0.0.0.0");
      expect(anonymizeIp("")).toBe("0.0.0.0");
    });
  });

  describe("hashIp", () => {
    it("generates deterministic HMAC SHA-256 hash", () => {
      const hash1 = hashIp("198.51.100.42", "custom_secret_salt");
      const hash2 = hashIp("198.51.100.42", "custom_secret_salt");
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);

      const diffSalt = hashIp("198.51.100.42", "another_salt");
      expect(diffSalt).not.toBe(hash1);
    });
  });

  describe("extractClientIp", () => {
    it("extracts first IP from x-forwarded-for header", () => {
      const req = {
        headers: {
          "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        },
      };
      expect(extractClientIp(req)).toBe("203.0.113.195");
    });

    it("falls back to req.ip or socket remote address", () => {
      const req = { ip: "127.0.0.1" };
      expect(extractClientIp(req)).toBe("127.0.0.1");
    });
  });

  describe("ipAnonymizerMiddleware", () => {
    it("populates rawClientIp, anonymizedIp, and ipHash", () => {
      const middleware = ipAnonymizerMiddleware({ salt: "test_salt" });
      const req = {
        headers: { "x-forwarded-for": "198.51.100.77" },
      };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.rawClientIp).toBe("198.51.100.77");
      expect(req.anonymizedIp).toBe("198.51.100.0");
      expect(req.ipHash).toHaveLength(64);
    });
  });
});
