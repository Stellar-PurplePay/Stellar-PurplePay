"use strict";

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key using scrypt.
 * @param {string|Buffer} secret
 * @param {Buffer} salt
 * @returns {Buffer}
 */
function deriveKey(secret, salt) {
  if (Buffer.isBuffer(secret) && secret.length === KEY_LENGTH) {
    return secret;
  }
  return crypto.scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt a backup payload using authenticated AES-256-GCM.
 *
 * @param {object|string} payload - Data to encrypt
 * @param {string|Buffer} secret - Password or 32-byte key
 * @returns {{
 *   version: number,
 *   algorithm: string,
 *   salt: string,
 *   iv: string,
 *   authTag: string,
 *   ciphertext: string,
 *   checksum: string,
 *   createdAt: string
 * }}
 */
function encryptSnapshot(payload, secret) {
  if (!secret) {
    throw new Error("Encryption secret or key is required");
  }

  const plainText = typeof payload === "string" ? payload : JSON.stringify(payload);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(secret, salt);

  const checksum = crypto.createHash("sha256").update(plainText).digest("hex");

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plainText, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    algorithm: ALGORITHM,
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext,
    checksum,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Decrypt and verify an authenticated backup snapshot.
 *
 * @param {object} snapshot
 * @param {string|Buffer} secret
 * @returns {any}
 */
function decryptSnapshot(snapshot, secret) {
  if (!snapshot || !snapshot.ciphertext || !snapshot.authTag || !snapshot.iv || !snapshot.salt) {
    throw new Error("Invalid snapshot format: missing essential cryptographic components");
  }

  if (snapshot.algorithm !== ALGORITHM) {
    throw new Error(`Unsupported snapshot algorithm: ${snapshot.algorithm}`);
  }

  if (!secret) {
    throw new Error("Decryption secret or key is required");
  }

  const salt = Buffer.from(snapshot.salt, "hex");
  const iv = Buffer.from(snapshot.iv, "hex");
  const authTag = Buffer.from(snapshot.authTag, "hex");
  const key = deriveKey(secret, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plainText;
  try {
    plainText = decipher.update(snapshot.ciphertext, "hex", "utf8");
    plainText += decipher.final("utf8");
  } catch (err) {
    throw new Error(`Decryption failed: integrity authentication check failed (${err.message})`, {
      cause: err,
    });
  }

  const computedChecksum = crypto.createHash("sha256").update(plainText).digest("hex");
  if (computedChecksum !== snapshot.checksum) {
    throw new Error("Decryption failed: checksum mismatch indicating corruption");
  }

  try {
    return JSON.parse(plainText);
  } catch {
    return plainText;
  }
}

/**
 * Creates an encrypted backup archive bundling metadata and records.
 */
function createEncryptedBackup(metadata, records, passphrase) {
  const payload = {
    metadata: {
      ...metadata,
      recordCount: Array.isArray(records) ? records.length : Object.keys(records || {}).length,
      archivedAt: new Date().toISOString(),
    },
    data: records,
  };

  return encryptSnapshot(payload, passphrase);
}

/**
 * Restores and validates an encrypted backup archive.
 */
function restoreEncryptedBackup(snapshot, passphrase) {
  return decryptSnapshot(snapshot, passphrase);
}

module.exports = {
  encryptSnapshot,
  decryptSnapshot,
  createEncryptedBackup,
  restoreEncryptedBackup,
};

