const crypto = require("crypto");

/**
 * Middleware generating unique request nonces and enforcing strict
 * Content Security Policy (CSP) headers tailored for Stellar/Soroban dApps.
 */
function createCspMiddleware(options = {}) {
  const extraConnectSrc = options.extraConnectSrc || [];

  return (req, res, next) => {
    // Generate unique cryptographically secure nonce
    const nonce = crypto.randomBytes(16).toString("base64");
    req.nonce = nonce;
    res.locals.nonce = nonce;

    const connectSrcDirectives = [
      "'self'",
      "https://horizon-testnet.stellar.org",
      "https://horizon.stellar.org",
      "https://soroban-testnet.stellar.org",
      "https://mainnet.sorobanrpc.com",
      "https://*.stellar.org",
      ...extraConnectSrc,
    ].join(" ");

    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: ipfs:",
      `connect-src ${connectSrcDirectives}`,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ];

    res.setHeader("Content-Security-Policy", cspDirectives.join("; "));
    next();
  };
}

module.exports = {
  createCspMiddleware,
};
