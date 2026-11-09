"use strict";

const { decodeSorobanError } = require("./sorobanErrorDecoder");

describe("sorobanErrorDecoder", () => {
  it("decodes known contract error codes", () => {
    const errorMsg = "HostError: Error(Contract, #3)";
    const decoded = decodeSorobanError(errorMsg);

    expect(decoded.category).toBe("contract");
    expect(decoded.code).toBe(3);
    expect(decoded.name).toBe("Unauthorized");
    expect(decoded.description).toContain("Caller does not have required permissions");
  });

  it("handles unknown contract error code gracefully", () => {
    const errorMsg = "HostError: Error(Contract, #999)";
    const decoded = decodeSorobanError(errorMsg);

    expect(decoded.category).toBe("contract");
    expect(decoded.code).toBe(999);
    expect(decoded.name).toBe("UnknownContractError_999");
    expect(decoded.description).toContain("#999");
  });

  it("decodes host error types such as Storage.MissingValue", () => {
    const errorMsg = "HostError: Error(Storage, MissingValue)";
    const decoded = decodeSorobanError(errorMsg);

    expect(decoded.category).toBe("host");
    expect(decoded.code).toBe("MissingValue");
    expect(decoded.name).toBe("Storage.MissingValue");
    expect(decoded.description).toContain("Host storage failure");
  });

  it("decodes host Auth failure", () => {
    const errorMsg = "HostError: Error(Auth, InvalidAction)";
    const decoded = decodeSorobanError(errorMsg);

    expect(decoded.category).toBe("host");
    expect(decoded.name).toBe("Auth.InvalidAction");
    expect(decoded.description).toContain("Contract authorization verification failure");
  });

  it("falls back to unknown for non-Soroban errors", () => {
    const decoded = decodeSorobanError(new Error("Connection reset by peer"));
    expect(decoded.category).toBe("unknown");
    expect(decoded.description).toBe("Connection reset by peer");
  });
});
