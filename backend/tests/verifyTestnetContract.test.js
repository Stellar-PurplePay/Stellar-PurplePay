const StellarSdk = require("@stellar/stellar-sdk");
const ContractDeploymentVerifier = require("../scripts/verifyTestnetContract");

describe("ContractDeploymentVerifier Script", () => {
  const validAdmin = StellarSdk.Keypair.random().publicKey();
  const validTreasury = StellarSdk.Keypair.random().publicKey();
  const validContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  it("should validate a properly formatted Soroban contract address", () => {
    expect(
      ContractDeploymentVerifier.validateContractAddress(validContractId).valid
    ).toBe(true);

    expect(
      ContractDeploymentVerifier.validateContractAddress("GINVALIDCONTRACT").valid
    ).toBe(false);

    expect(
      ContractDeploymentVerifier.validateContractAddress("").valid
    ).toBe(false);
  });

  it("should verify healthy deployment state when all parameters comply", () => {
    const result = ContractDeploymentVerifier.verifyContractState({
      contractId: validContractId,
      admin: validAdmin,
      treasury: validTreasury,
      feeBps: 150,
      isPaused: false,
    });

    expect(result.healthy).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.feeBps).toBe(150);
  });

  it("should detect invalid admin, excessive fee, and paused states", () => {
    const result = ContractDeploymentVerifier.verifyContractState({
      contractId: validContractId,
      admin: "INVALID_G_KEY",
      treasury: validTreasury,
      feeBps: 1500, // > 1000 ceiling
      isPaused: true,
    });

    expect(result.healthy).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.errors.some((e) => e.includes("admin"))).toBe(true);
    expect(result.errors.some((e) => e.includes("fee BPS"))).toBe(true);
    expect(result.errors.some((e) => e.includes("PAUSED"))).toBe(true);
  });
});

