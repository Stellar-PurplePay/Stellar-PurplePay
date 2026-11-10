const { ContractRegistry, contractRegistry } = require("./contractRegistry");

describe("ContractRegistry Singleton & Service", () => {
  it("should resolve default testnet escrow and USDC contract addresses", () => {
    const testnetConf = contractRegistry.getRegistry("testnet");
    expect(testnetConf.escrowContractId).toMatch(/^C[A-Z2-7]{55}$/);
    expect(testnetConf.usdcTokenId).toMatch(/^C[A-Z2-7]{55}$/);
    expect(testnetConf.networkPassphrase).toContain("Test SDF Network");

    expect(contractRegistry.getEscrowContractId("testnet")).toBe(
      testnetConf.escrowContractId
    );
    expect(contractRegistry.getUsdcTokenId("testnet")).toBe(
      testnetConf.usdcTokenId
    );
  });

  it("should resolve public mainnet configuration for 'mainnet' or 'public'", () => {
    const mainnetConf = contractRegistry.getRegistry("mainnet");
    const publicConf = contractRegistry.getRegistry("public");

    expect(mainnetConf).toEqual(publicConf);
    expect(mainnetConf.networkPassphrase).toContain("Public Global Stellar Network");
  });

  it("should update contract address and validate format", () => {
    const custom = new ContractRegistry();
    const newContractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    custom.setContractId("testnet", newContractId);
    expect(custom.getEscrowContractId("testnet")).toBe(newContractId);

    expect(() => {
      custom.setContractId("testnet", "INVALID_NOT_56_CHARS");
    }).toThrow(/Invalid Soroban contract address/);
  });

  it("should validate all default registry addresses", () => {
    const status = contractRegistry.validateAllAddresses();
    expect(status.testnet.escrowValid).toBe(true);
    expect(status.testnet.usdcValid).toBe(true);
    expect(status.public.escrowValid).toBe(true);
    expect(status.public.usdcValid).toBe(true);
  });
});
