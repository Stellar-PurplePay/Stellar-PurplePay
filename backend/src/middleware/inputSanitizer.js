/**
 * Input sanitizer defense against prototype pollution, XSS injection,
 * and null-byte bypass attacks across request body, query, and params.
 */

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeString(str) {
  if (typeof str !== "string") return str;

  return str
    // Strip null byte
    .replace(/\0/g, "")
    // Strip script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Strip inline event handlers like onload=, onerror=, onclick=
    .replace(/\bon\w+\s*=/gi, "")
    // Strip javascript: pseudo-protocols
    .replace(/javascript:/gi, "")
    // Strip vbscript: pseudo-protocols
    .replace(/vbscript:/gi, "")
    // Strip data:text/html vectors
    .replace(/data:text\/html/gi, "");
}

function sanitizeValue(val, seen = new WeakSet()) {
  if (val === null || val === undefined) {
    return val;
  }

  if (typeof val === "string") {
    return sanitizeString(val);
  }

  if (typeof val === "number" || typeof val === "boolean") {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeValue(item, seen));
  }

  if (typeof val === "object") {
    if (seen.has(val)) {
      return val;
    }
    seen.add(val);

    const sanitizedObj = {};
    for (const key of Object.keys(val)) {
      if (DANGEROUS_KEYS.has(key)) {
        // Strip prototype pollution keys
        continue;
      }
      sanitizedObj[key] = sanitizeValue(val[key], seen);
    }
    return sanitizedObj;
  }

  return val;
}

function sanitizeInputMiddleware(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeValue(req.params);
  }
  next();
}

module.exports = {
  sanitizeString,
  sanitizeValue,
  sanitizeInputMiddleware,
};

