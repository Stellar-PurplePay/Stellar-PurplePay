"use strict";

/**
 * src/utils/credentialMasker.js
 *
 * Production credential and key scrubber for logs, exceptions, and audit trails.
 * Sanitizes Stellar secret seeds, PEM private keys, JWTs, HTTP Bearer tokens,
 * passwords, and sensitive nested JSON properties.
 */

// Matches Stellar S... 56-character base32 secret keys
const STELLAR_SECRET_PATTERN = /\bS[A-Z2-7]{55}\b/g;

// Matches PEM Private Keys
const PEM_PRIVATE_KEY_PATTERN = /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )?PRIVATE KEY-----/g;

// Matches Bearer tokens
const BEARER_TOKEN_PATTERN = /Bearer\s+([A-Za-z0-9\-_.~+/]+=*)/gi;

// Matches typical JWTs (header.payload.signature)
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_\-+./=]{10,}\b/g;

// Matches sensitive key names in objects
const SENSITIVE_KEY_REGEX = /^(?:password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|auth(?:orization)?|private[_-]?key|seed(?:[_-]?phrase)?|passphrase|client[_-]?secret)$/i;

/**
 * Scrub credentials and sensitive tokens from a raw string.
 * @param {string} str
 * @returns {string}
 */
function maskString(str) {
  if (typeof str !== "string") {
    return str;
  }

  return str
    .replace(PEM_PRIVATE_KEY_PATTERN, "[REDACTED_PRIVATE_KEY]")
    .replace(STELLAR_SECRET_PATTERN, "[REDACTED_STELLAR_SECRET_KEY]")
    .replace(BEARER_TOKEN_PATTERN, "Bearer [REDACTED_BEARER_TOKEN]")
    .replace(JWT_PATTERN, "[REDACTED_JWT_TOKEN]");
}

/**
 * Recursively scrubs credentials from an object or array.
 * Protected against circular references and max depth.
 *
 * @param {any} input
 * @param {number} [depth=0]
 * @param {WeakSet} [seen=new WeakSet()]
 * @returns {any}
 */
function maskObject(input, depth = 0, seen = new WeakSet()) {
  if (depth > 8) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (input === null || typeof input !== "object") {
    if (typeof input === "string") {
      return maskString(input);
    }
    return input;
  }

  if (seen.has(input)) {
    return "[CIRCULAR_REFERENCE]";
  }
  seen.add(input);

  if (Array.isArray(input)) {
    return input.map((item) => maskObject(item, depth + 1, seen));
  }

  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = maskObject(value, depth + 1, seen);
    }
  }

  return result;
}

/**
 * Scrub sensitive HTTP headers.
 * @param {Record<string, any>} headers
 * @returns {Record<string, any>}
 */
function maskHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};
  const cleaned = {};
  for (const [key, val] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "authorization" ||
      lowerKey === "proxy-authorization" ||
      lowerKey === "cookie" ||
      lowerKey === "set-cookie" ||
      lowerKey.includes("key") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token")
    ) {
      cleaned[key] = "[REDACTED]";
    } else {
      cleaned[key] = typeof val === "string" ? maskString(val) : val;
    }
  }
  return cleaned;
}

/**
 * Scrub sensitive query parameters or basic auth from a URL string.
 * @param {string} urlStr
 * @returns {string}
 */
function maskUrl(urlStr) {
  if (typeof urlStr !== "string") return urlStr;
  try {
    const parsed = new URL(urlStr);
    if (parsed.password) {
      parsed.password = "[REDACTED]";
    }
    for (const param of parsed.searchParams.keys()) {
      if (SENSITIVE_KEY_REGEX.test(param)) {
        parsed.searchParams.set(param, "[REDACTED]");
      }
    }
    return parsed.toString();
  } catch {
    // If not a full URL, fallback to string masking
    return maskString(urlStr);
  }
}

module.exports = {
  maskString,
  maskObject,
  maskHeaders,
  maskUrl,
};
