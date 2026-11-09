import {
  TESTNET_PASSPHRASE,
  MAINNET_PASSPHRASE,
  FUTURENET_PASSPHRASE,
  getNetworkFromPassphrase,
  getNetworkDisplayName,
  validateNetworkMatch,
  getStellarExpertUrl,
} from "../utils/networkValidator";

describe("networkValidator", () => {
  describe("getNetworkFromPassphrase", () => {
    it("identifies testnet passphrase", () => {
      expect(getNetworkFromPassphrase(TESTNET_PASSPHRASE)).toBe("testnet");
    });

    it("identifies mainnet passphrase", () => {
      expect(getNetworkFromPassphrase(MAINNET_PASSPHRASE)).toBe("mainnet");
    });

    it("identifies futurenet passphrase", () => {
      expect(getNetworkFromPassphrase(FUTURENET_PASSPHRASE)).toBe("futurenet");
    });

    it("returns unknown for invalid or empty passphrase", () => {
      expect(getNetworkFromPassphrase(undefined)).toBe("unknown");
      expect(getNetworkFromPassphrase("Custom Private Network")).toBe("unknown");
    });
  });

  describe("getNetworkDisplayName", () => {
    it("returns friendly names for known networks", () => {
      expect(getNetworkDisplayName("testnet")).toBe("Stellar Testnet");
      expect(getNetworkDisplayName(MAINNET_PASSPHRASE)).toBe("Stellar Public Network (Mainnet)");
      expect(getNetworkDisplayName("custom")).toBe("Custom Network");
    });
  });

  describe("validateNetworkMatch", () => {
    it("returns matches true when networks align", () => {
      const result = validateNetworkMatch("testnet", TESTNET_PASSPHRASE);
      expect(result.matches).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it("returns matches false with descriptive warning when networks differ", () => {
      const result = validateNetworkMatch("testnet", MAINNET_PASSPHRASE);
      expect(result.matches).toBe(false);
      expect(result.walletNetwork).toBe("mainnet");
      expect(result.warning).toContain("Network mismatch detected");
      expect(result.warning).toContain("Stellar Testnet");
      expect(result.warning).toContain("Stellar Public Network (Mainnet)");
    });
  });

  describe("getStellarExpertUrl", () => {
    it("generates correct transaction explorer URLs", () => {
      const txHash = "0123456789abcdef";
      expect(getStellarExpertUrl(txHash, "testnet", "tx")).toBe(
        "https://stellar.expert/explorer/testnet/tx/0123456789abcdef"
      );
      expect(getStellarExpertUrl(txHash, "mainnet", "tx")).toBe(
        "https://stellar.expert/explorer/public/tx/0123456789abcdef"
      );
    });

    it("generates correct contract explorer URLs", () => {
      const contractId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      expect(getStellarExpertUrl(contractId, "testnet", "contract")).toBe(
        `https://stellar.expert/explorer/testnet/contract/${contractId}`
      );
    });
  });
});
