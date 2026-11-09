"use strict";

/**
 * Returns the client IP for rate limiting and logging.
 *
 * With `trust proxy` enabled, Express derives req.ip from X-Forwarded-For.
 * To prevent bypass via spoofed headers on direct connections, forwarded
 * headers are only trusted when the TCP peer matches TRUSTED_PROXY_IPS.
 */
function normalizeIp(ip) {
  if (!ip) return "";
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function getTrustedProxyIps() {
  return (process.env.TRUSTED_PROXY_IPS || "")
    .split(",")
    .map((entry) => normalizeIp(entry.trim()))
    .filter(Boolean);
}

function getClientIp(req) {
  const socketIp = normalizeIp(req.socket?.remoteAddress || "");
  const trustedProxies = getTrustedProxyIps();

  if (
    req.app?.get?.("trust proxy") &&
    trustedProxies.length > 0 &&
    trustedProxies.includes(socketIp) &&
    req.ip
  ) {
    return normalizeIp(req.ip);
  }

  return socketIp || normalizeIp(req.ip || "") || "unknown";
}

function maskSubnet(ip) {
  const normalized = normalizeIp(ip);
  if (!normalized || normalized === "unknown") return "unknown";

  // IPv4 /24 subnet masking
  if (normalized.includes(".")) {
    const parts = normalized.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }

  // IPv6 /64 prefix masking
  if (normalized.includes(":")) {
    const segments = normalized.split(":");
    return segments.slice(0, 4).join(":") + "::/64";
  }

  return normalized;
}

module.exports = { getClientIp, normalizeIp, getTrustedProxyIps, maskSubnet };
