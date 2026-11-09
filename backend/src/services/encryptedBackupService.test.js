"use strict";

const {
  encryptSnapshot,
  decryptSnapshot,
  createEncryptedBackup,
  restoreEncryptedBackup,
} = require("./encryptedBackupService");

describe("encryptedBackupService", () => {
  const passphrase = "stellar-purplepay-backup-secret-2026";
  const sampleData = {
    escrows: [
      { id: "esc-101", amount: 1500, asset: "USDC", status: "completed" },
      { id: "esc-102", amount: 4500, asset: "XLM", status: "disputed" },
    ],
    timestamp: "2026-11-10T00:00:00Z",
  };

  it("should encrypt and decrypt a JSON payload successfully", () => {
    const encrypted = encryptSnapshot(sampleData, passphrase);

    expect(encrypted.version).toBe(1);
    expect(encrypted.algorithm).toBe("aes-256-gcm");
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.salt).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.checksum).toBeDefined();

    const restored = decryptSnapshot(encrypted, passphrase);
    expect(restored).toEqual(sampleData);
  });

  it("should encrypt and decrypt raw string data", () => {
    const rawString = "Stellar Horizon Transaction Batch Snapshot";
    const encrypted = encryptSnapshot(rawString, passphrase);
    const decrypted = decryptSnapshot(encrypted, passphrase);
    expect(decrypted).toBe(rawString);
  });

  it("should throw error if decryption passphrase is wrong", () => {
    const encrypted = encryptSnapshot(sampleData, passphrase);
    expect(() => {
      decryptSnapshot(encrypted, "incorrect-passphrase");
    }).toThrow(/Decryption failed: integrity authentication check failed/);
  });

  it("should detect ciphertext tampering", () => {
    const encrypted = encryptSnapshot(sampleData, passphrase);
    // Tamper with ciphertext
    const tamperedCiphertext =
      encrypted.ciphertext.substring(0, 10) +
      (encrypted.ciphertext[10] === "a" ? "b" : "a") +
      encrypted.ciphertext.substring(11);

    const tampered = { ...encrypted, ciphertext: tamperedCiphertext };

    expect(() => {
      decryptSnapshot(tampered, passphrase);
    }).toThrow(/integrity authentication check failed/);
  });

  it("should detect authTag tampering", () => {
    const encrypted = encryptSnapshot(sampleData, passphrase);
    const tamperedTag =
      encrypted.authTag.substring(0, 4) + "0000" + encrypted.authTag.substring(8);

    const tampered = { ...encrypted, authTag: tamperedTag };

    expect(() => {
      decryptSnapshot(tampered, passphrase);
    }).toThrow(/integrity authentication check failed/);
  });

  it("should reject corrupted checksum when payload is tampered", () => {
    const encrypted = encryptSnapshot(sampleData, passphrase);
    const tampered = { ...encrypted, checksum: "badchecksumbadchecksumbadchecksumbadchecksumbadchecksum12345678" };

    expect(() => {
      decryptSnapshot(tampered, passphrase);
    }).toThrow(/checksum mismatch/);
  });

  it("should support createEncryptedBackup and restoreEncryptedBackup", () => {
    const metadata = { environment: "production", version: "1.0.0" };
    const records = [{ id: 1, action: "payout" }, { id: 2, action: "refund" }];

    const backup = createEncryptedBackup(metadata, records, passphrase);
    expect(backup.ciphertext).toBeDefined();

    const restored = restoreEncryptedBackup(backup, passphrase);
    expect(restored.metadata.environment).toBe("production");
    expect(restored.metadata.recordCount).toBe(2);
    expect(restored.data).toEqual(records);
  });

  it("should validate required inputs", () => {
    expect(() => encryptSnapshot("test", "")).toThrow(/Encryption secret or key is required/);
    expect(() => decryptSnapshot(null, passphrase)).toThrow(/Invalid snapshot format/);
    expect(() => decryptSnapshot({}, passphrase)).toThrow(/Invalid snapshot format/);
    expect(() => {
      const valid = encryptSnapshot("data", passphrase);
      decryptSnapshot(valid, "");
    }).toThrow(/Decryption secret or key is required/);
  });
});
