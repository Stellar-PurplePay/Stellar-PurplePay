const crypto = require("crypto");

/**
 * IP anonymization utility providing subnet masking and HMAC pseudonymization
 * for GDPR compliance and secure audit logging.
 */

function extractClientIp(req) {
  if (!req) return "0.0.0.0";
  const xForwardedFor = req.headers?.["x-forwarded-for"];
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "0.0.0.0";
}

function anonymizeIp(ip) {
  if (!ip || typeof ip !== "string") {
    return "0.0.0.0";
  }

  const cleanIp = ip.replace(/^::ffff:/, "").trim();

  // IPv4 Check
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanIp)) {
    const parts = cleanIp.split(".");
    parts[3] = "0";
    return parts.join(".");
  }

  // IPv6 Check
  if (cleanIp.includes(":")) {
    const parts = cleanIp.split(":");
    // Keep first 3 segments and mask remaining
    const prefix = parts.slice(0, 3).join(":");
    return `${prefix}::0`;
  }

  return cleanIp;
}

function hashIp(ip, salt = "stellar_privacy_salt") {
  if (!ip || typeof ip !== "string") {
    return "";
  }
  return crypto.createHmac("sha256", salt).update(ip.trim()).digest("hex");
}

function ipAnonymizerMiddleware(options = {}) {
  const salt = options.salt || process.env.IP_HASH_SALT || "stellar_privacy_salt";

  return (req, res, next) => {
    const rawIp = extractClientIp(req);
    req.rawClientIp = rawIp;
    req.anonymizedIp = anonymizeIp(rawIp);
    req.ipHash = hashIp(rawIp, salt);
    next();
  };
}

module.exports = {
  extractClientIp,
  anonymizeIp,
  hashIp,
  ipAnonymizerMiddleware,
};

