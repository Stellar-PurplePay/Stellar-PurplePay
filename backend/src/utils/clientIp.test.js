"use strict";

const { normalizeIp, getClientIp, getTrustedProxyIps, maskSubnet } = require("./clientIp");

describe("getClientIp", () => {
  const originalTrustedProxies = process.env.TRUSTED_PROXY_IPS;

  afterEach(() => {
    if (originalTrustedProxies === undefined) {
      delete process.env.TRUSTED_PROXY_IPS;
    } else {
      process.env.TRUSTED_PROXY_IPS = originalTrustedProxies;
    }
  });

  it("ignores spoofed X-Forwarded-For on direct connections", () => {
    delete process.env.TRUSTED_PROXY_IPS;

    const req = {
      app: { get: () => 1 },
      ip: "198.51.100.20",
      headers: { "x-forwarded-for": "198.51.100.20" },
      socket: { remoteAddress: "::ffff:203.0.113.10" },
    };

    expect(getClientIp(req)).toBe("203.0.113.10");
  });

  it("uses req.ip when the socket peer is a configured trusted proxy", () => {
    process.env.TRUSTED_PROXY_IPS = "10.0.0.5";

    const req = {
      app: { get: () => 1 },
      ip: "203.0.113.10",
      headers: { "x-forwarded-for": "203.0.113.10" },
      socket: { remoteAddress: "10.0.0.5" },
    };

    expect(getClientIp(req)).toBe("203.0.113.10");
  });

  it("normalizes IPv4-mapped IPv6 addresses", () => {
    expect(normalizeIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(getTrustedProxyIps()).toEqual([]);
  });

  describe("maskSubnet", () => {
    it("masks IPv4 to /24 subnet", () => {
      expect(maskSubnet("192.168.1.55")).toBe("192.168.1.0/24");
      expect(maskSubnet("::ffff:10.20.30.40")).toBe("10.20.30.0/24");
    });

    it("masks IPv6 to /64 prefix", () => {
      expect(maskSubnet("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:0db8:85a3:0000::/64");
    });

    it("handles unknown or empty IPs gracefully", () => {
      expect(maskSubnet("")).toBe("unknown");
      expect(maskSubnet(null)).toBe("unknown");
    });
  });
});
