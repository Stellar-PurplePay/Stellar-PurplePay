const { createCspMiddleware } = require("./cspMiddleware");

describe("createCspMiddleware", () => {
  it("generates a unique nonce per request and sets CSP headers", () => {
    const middleware = createCspMiddleware();
    const req1 = {};
    const res1 = {
      locals: {},
      setHeader: jest.fn(),
    };
    const next1 = jest.fn();

    middleware(req1, res1, next1);

    expect(next1).toHaveBeenCalledTimes(1);
    expect(req1.nonce).toBeDefined();
    expect(res1.locals.nonce).toBe(req1.nonce);
    expect(res1.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining(`script-src 'self' 'nonce-${req1.nonce}'`)
    );
    expect(res1.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("https://horizon-testnet.stellar.org")
    );
    expect(res1.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("frame-ancestors 'none'")
    );

    // Second request has distinct nonce
    const req2 = {};
    const res2 = { locals: {}, setHeader: jest.fn() };
    middleware(req2, res2, jest.fn());

    expect(req2.nonce).not.toBe(req1.nonce);
  });

  it("appends extra connect-src domains when configured", () => {
    const middleware = createCspMiddleware({
      extraConnectSrc: ["https://ipfs.infura.io:5001", "wss://realtime.stellar-purplepay.io"],
    });
    const req = {};
    const res = { locals: {}, setHeader: jest.fn() };

    middleware(req, res, jest.fn());

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      expect.stringContaining("https://ipfs.infura.io:5001 wss://realtime.stellar-purplepay.io")
    );
  });
});

