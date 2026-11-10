const { createCorsSecurityMiddleware } = require("./corsSecurity");

describe("createCorsSecurityMiddleware", () => {
  it("allows requests without origin header (direct/server-to-server)", () => {
    const middleware = createCorsSecurityMiddleware();
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it("sets CORS headers for allowlisted production origin", () => {
    const middleware = createCorsSecurityMiddleware();
    const req = {
      headers: { origin: "https://app.stellar-purplepay.io" },
      method: "GET",
    };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "https://app.stellar-purplepay.io"
    );
    expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Credentials", "true");
  });

  it("handles OPTIONS preflight for allowlisted origin with 204", () => {
    const middleware = createCorsSecurityMiddleware();
    const req = {
      headers: { origin: "http://localhost:3000" },
      method: "OPTIONS",
    };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  it("permits preview deployments matching allowRegex", () => {
    const middleware = createCorsSecurityMiddleware();
    const req = {
      headers: { origin: "https://feature-escrow--stellar-purplepay.vercel.app" },
      method: "POST",
    };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "https://feature-escrow--stellar-purplepay.vercel.app"
    );
  });

  it("rejects unauthorized origin with 403 Forbidden", () => {
    const middleware = createCorsSecurityMiddleware();
    const req = {
      headers: { origin: "https://malicious-phishing-site.com" },
      method: "POST",
    };
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Forbidden" })
    );
  });
});

