/**
 * Hardened HTTP security headers middleware enforcing modern browser
 * transport security, content sniffing prevention, and cross-origin isolation.
 */

function createSecureHeadersMiddleware(options = {}) {
  const hstsMaxAge = options.hstsMaxAge || 63072000; // 2 years
  const enableHstsPreload = options.enableHstsPreload !== false;

  return (req, res, next) => {
    // Strip framework fingerprinting
    res.removeHeader("X-Powered-By");

    // Strict Transport Security (HSTS)
    const hstsDirectives = [`max-age=${hstsMaxAge}`, "includeSubDomains"];
    if (enableHstsPreload) {
      hstsDirectives.push("preload");
    }
    res.setHeader("Strict-Transport-Security", hstsDirectives.join("; "));

    // Anti-clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // MIME sniffing protection
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Referrer policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Disable legacy buggy XSS auditor
    res.setHeader("X-XSS-Protection", "0");

    // Restrict high-risk hardware APIs
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()"
    );

    // Cross-origin isolation
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");

    next();
  };
}

module.exports = {
  createSecureHeadersMiddleware,
};

