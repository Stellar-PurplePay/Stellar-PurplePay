const { createSecureHeadersMiddleware } = require("./secureHeaders");

describe("createSecureHeadersMiddleware", () => {
  it("sets all required defense-in-depth HTTP security headers", () => {
    const middleware = createSecureHeadersMiddleware();
    const req = {};
    const res = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.removeHeader).toHaveBeenCalledWith("X-Powered-By");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Referrer-Policy",
      "strict-origin-when-cross-origin"
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-XSS-Protection", "0");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()"
    );
    expect(res.setHeader).toHaveBeenCalledWith("Cross-Origin-Opener-Policy", "same-origin");
    expect(res.setHeader).toHaveBeenCalledWith("Cross-Origin-Resource-Policy", "same-site");
  });

  it("supports configurable HSTS max age", () => {
    const middleware = createSecureHeadersMiddleware({
      hstsMaxAge: 31536000,
      enableHstsPreload: false,
    });
    const req = {};
    const res = { setHeader: jest.fn(), removeHeader: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  });
});

