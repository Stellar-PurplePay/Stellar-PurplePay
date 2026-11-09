"use strict";

const { sanitizeBody, generateRequestId, resolveRequestId } = require("./logger");

describe("logger utility - sanitizeBody", () => {
  it("redacts top-level and nested sensitive keys", () => {
    const input = {
      username: "alice",
      password: "SuperSecretPassword123!",
      nested: {
        apiKey: "pk_live_123456",
        safeNote: "Hello world",
        auth: {
          refreshToken: "eyJhbGciOi...",
        },
      },
    };

    const sanitized = sanitizeBody(input);

    expect(sanitized.username).toBe("alice");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.nested.apiKey).toBe("[REDACTED]");
    expect(sanitized.nested.safeNote).toBe("Hello world");
    expect(sanitized.nested.auth).toBe("[REDACTED]");
  });

  it("redacts raw Stellar secret keys from string values", () => {
    const validSecretKey = "SA" + "B".repeat(54);
    const input = {
      comment: `Deploy completed using secret key ${validSecretKey} on network`,
      details: {
        note: `Backup: ${validSecretKey}`,
      },
    };

    const sanitized = sanitizeBody(input);

    expect(sanitized.comment).toContain("S[REDACTED_SECRET_KEY]");
    expect(sanitized.comment).not.toContain(validSecretKey);
    expect(sanitized.details.note).toContain("S[REDACTED_SECRET_KEY]");
  });

  it("handles arrays and null/primitive inputs gracefully", () => {
    expect(sanitizeBody(null)).toBe(null);
    expect(sanitizeBody(undefined)).toBe(undefined);
    expect(sanitizeBody(12345)).toBe(12345);

    const list = [
      { id: 1, secretToken: "abc" },
      { id: 2, title: "Public title" },
    ];
    const sanitizedList = sanitizeBody(list);

    expect(sanitizedList[0].secretToken).toBe("[REDACTED]");
    expect(sanitizedList[1].title).toBe("Public title");
  });
});

describe("logger correlation id", () => {
  it("generates valid UUID correlation IDs", () => {
    const id = generateRequestId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("honors valid client X-Request-ID and mints new for invalid", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const reqWithValid = { get: jest.fn().mockReturnValue(validUuid) };
    expect(resolveRequestId(reqWithValid)).toBe(validUuid);

    const reqWithInvalid = { get: jest.fn().mockReturnValue("bad-id") };
    const minted = resolveRequestId(reqWithInvalid);
    expect(minted).not.toBe("bad-id");
    expect(minted).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
