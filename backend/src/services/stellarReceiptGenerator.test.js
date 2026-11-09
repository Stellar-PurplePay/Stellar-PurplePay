"use strict";

const StellarReceiptGenerator = require("./stellarReceiptGenerator");

describe("StellarReceiptGenerator", () => {
  const validClient = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const validFreelancer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const validTxHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  it("generates a valid structured receipt with SHA-256 digest", () => {
    const receipt = StellarReceiptGenerator.generateReceipt({
      receiptId: 42,
      txHash: validTxHash,
      ledgerSequence: 1234567,
      jobId: "job-101",
      milestoneId: 1,
      clientAddress: validClient,
      freelancerAddress: validFreelancer,
      amount: "150.0000000",
      asset: "USDC",
      platformFee: "1.5000000",
      network: "testnet",
      timestamp: 1700000000,
    });

    expect(receipt.receiptSerial).toBe("RCP-STLR-00000042");
    expect(receipt.digest).toHaveLength(64);
    expect(receipt.transaction.hash).toBe(validTxHash);
    expect(receipt.transaction.explorerUrl).toContain("stellar.expert/explorer/testnet/tx");
    expect(receipt.settlement.grossAmount).toBe("150.0000000");
    expect(receipt.settlement.asset).toBe("USDC");
    expect(receipt.jsonLd["@type"]).toBe("PaymentReceipt");
  });

  it("throws error for invalid transaction hash", () => {
    expect(() => {
      StellarReceiptGenerator.generateReceipt({
        txHash: "short_hash",
        jobId: "job-1",
        clientAddress: validClient,
        freelancerAddress: validFreelancer,
        amount: "50",
      });
    }).toThrow("Invalid 32-byte hexadecimal transaction hash");
  });

  it("throws error for invalid client address", () => {
    expect(() => {
      StellarReceiptGenerator.generateReceipt({
        txHash: validTxHash,
        jobId: "job-1",
        clientAddress: "invalid",
        freelancerAddress: validFreelancer,
        amount: "50",
      });
    }).toThrow("Invalid client Stellar address");
  });

  it("throws error for non-positive amount", () => {
    expect(() => {
      StellarReceiptGenerator.generateReceipt({
        txHash: validTxHash,
        jobId: "job-1",
        clientAddress: validClient,
        freelancerAddress: validFreelancer,
        amount: "-10",
      });
    }).toThrow("Invalid payment amount");
  });
});
