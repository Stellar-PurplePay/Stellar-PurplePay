import { validateStellarAccount } from "../utils/stellarAccountValidator";

describe("stellarAccountValidator", () => {
  const validGAddress = "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP";
  const validCAddress = "CA5DEQZ64FKZL7KVWOEKXWJVZJXP4JKEQUAO7GFNYZYQRKI6N5CWEDU3";

  it("validates standard G-address Ed25519 public keys", () => {
    const res = validateStellarAccount(validGAddress);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("ed25519");
    expect(res.normalizedAddress).toBe(validGAddress);
  });

  it("rejects corrupted G-address with invalid checksum", () => {
    const corrupted = "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJA";
    const res = validateStellarAccount(corrupted);
    expect(res.isValid).toBe(false);
    expect(res.type).toBe("invalid");
    expect(res.error).toContain("Invalid Ed25519 public key checksum");
  });

  it("validates Soroban contract IDs", () => {
    const res = validateStellarAccount(validCAddress);
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("contract");
  });

  it("validates federated address format", () => {
    const res = validateStellarAccount("alice*lobstr.co");
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("federated");
    expect(res.normalizedAddress).toBe("alice*lobstr.co");
  });

  it("rejects malformed federation addresses", () => {
    const res = validateStellarAccount("alice*invalid_domain");
    expect(res.isValid).toBe(false);
    expect(res.type).toBe("invalid");
    expect(res.error).toContain("Invalid federation address format");
  });

  it("rejects empty or non-string inputs", () => {
    const empty = validateStellarAccount("");
    expect(empty.isValid).toBe(false);
    expect(empty.error).toBe("Address cannot be empty");
  });
});
