/**
 * Security-hardened CORS middleware enforcing strict origin allowlisting,
 * credentials validation, and preflight response management.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://stellar-purplepay.org",
  "https://app.stellar-purplepay.io",
];

function createCorsSecurityMiddleware(options = {}) {
  const allowedOrigins = options.allowedOrigins || DEFAULT_ALLOWED_ORIGINS;
  const allowRegex = options.allowRegex || /^https:\/\/[a-z0-9-]+--stellar-purplepay\.vercel\.app$/;

  const isOriginAllowed = (origin) => {
    if (!origin) return false;
    if (allowedOrigins.includes(origin)) return true;
    if (allowRegex && allowRegex.test(origin)) return true;
    return false;
  };

  return (req, res, next) => {
    const origin = req.headers.origin;

    // Requests without origin (like direct curl or server-to-server) pass through
    if (!origin) {
      return next();
    }

    if (isOriginAllowed(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Stellar-Signature"
      );
      res.setHeader("Access-Control-Max-Age", "86400");

      if (req.method === "OPTIONS") {
        return res.status(204).end();
      }

      return next();
    }

    // Origin is not allowed
    if (req.method === "OPTIONS") {
      return res.status(403).json({
        error: "Forbidden",
        message: "CORS policy: Origin not allowed",
      });
    }

    return res.status(403).json({
      error: "Forbidden",
      message: `CORS policy: Origin ${origin} is not authorized`,
    });
  };
}

module.exports = {
  createCorsSecurityMiddleware,
  DEFAULT_ALLOWED_ORIGINS,
};

