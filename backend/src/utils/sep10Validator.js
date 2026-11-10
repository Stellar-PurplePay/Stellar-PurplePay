"use strict";

const StellarSdk = require("@stellar/stellar-sdk");

class Sep10ValidationError extends Error {
  constructor(message, code = "INVALID_SEP10_CHALLENGE") {
    super(message);
    this.name = "Sep10ValidationError";
    this.code = code;
  }
}

/**
 * Validates a SEP-0010 Stellar Web Authentication challenge transaction.
 *
 * @param {object} params
 * @param {string} params.transactionXdr - Base64 encoded transaction envelope
 * @param {string} params.serverSigningKey - Server Stellar public key (G...)
 * @param {string} params.clientPublicKey - Client Stellar public key (G...)
 * @param {string} [params.networkPassphrase] - Stellar network passphrase
 * @param {string} [params.homeDomain] - Server domain (e.g. purplepay.app)
 * @param {number} [params.gracePeriodSeconds] - Clock drift tolerance (default 300)
 * @param {number} [params.nowSeconds] - Current UNIX timestamp override for testing
 * @returns {{
 *   isValid: boolean,
 *   clientPublicKey: string,
 *   homeDomain: string,
 *   nonce: string,
 *   minTime: number,
 *   maxTime: number
 * }}
 */
function validateSep10Challenge(params) {
  const {
    transactionXdr,
    serverSigningKey,
    clientPublicKey,
    networkPassphrase = StellarSdk.Networks.TESTNET,
    homeDomain = "purplepay.app",
    gracePeriodSeconds = 300,
    nowSeconds = Math.floor(Date.now() / 1000),
  } = params || {};

  if (!transactionXdr || typeof transactionXdr !== "string") {
    throw new Sep10ValidationError("transactionXdr is required");
  }
  if (!serverSigningKey || !StellarSdk.StrKey.isValidEd25519PublicKey(serverSigningKey)) {
    throw new Sep10ValidationError("Valid serverSigningKey is required");
  }
  if (!clientPublicKey || !StellarSdk.StrKey.isValidEd25519PublicKey(clientPublicKey)) {
    throw new Sep10ValidationError("Valid clientPublicKey is required");
  }

  let tx;
  try {
    tx = new StellarSdk.Transaction(transactionXdr, networkPassphrase);
  } catch (err) {
    throw new Sep10ValidationError(`Failed to parse transaction XDR: ${err.message}`);
  }

  // 1. Transaction source must match server key
  if (tx.source !== serverSigningKey) {
    throw new Sep10ValidationError(
      `Transaction source ${tx.source} does not match serverSigningKey ${serverSigningKey}`
    );
  }

  // 2. Sequence number must be "0"
  if (tx.sequence !== "0") {
    throw new Sep10ValidationError(`Sequence number must be '0', got '${tx.sequence}'`);
  }

  // 3. Time bounds must be present and valid
  if (!tx.timeBounds) {
    throw new Sep10ValidationError("Transaction must contain timeBounds");
  }
  const minTime = Number(tx.timeBounds.minTime);
  const maxTime = Number(tx.timeBounds.maxTime);

  if (nowSeconds < minTime - gracePeriodSeconds) {
    throw new Sep10ValidationError("Challenge transaction is not yet valid (premature)");
  }
  if (nowSeconds > maxTime + gracePeriodSeconds) {
    throw new Sep10ValidationError("Challenge transaction has expired");
  }

  // 4. Must have at least 1 operation
  if (!tx.operations || tx.operations.length === 0) {
    throw new Sep10ValidationError("Challenge transaction must contain at least one operation");
  }

  // 5. First operation must be manageData
  const op = tx.operations[0];
  if (op.type !== "manageData") {
    throw new Sep10ValidationError(`Operation 0 must be manageData, got '${op.type}'`);
  }

  // 6. Source of manageData must be client key
  if (op.source !== clientPublicKey) {
    throw new Sep10ValidationError(
      `manageData source ${op.source} does not match clientPublicKey ${clientPublicKey}`
    );
  }

  // 7. Data name must end with or match homeDomain auth
  const expectedName = `${homeDomain} auth`;
  if (op.name !== expectedName) {
    throw new Sep10ValidationError(
      `manageData key '${op.name}' does not match expected '${expectedName}'`
    );
  }

  const nonce = op.value ? op.value.toString("base64") : "";
  if (!nonce) {
    throw new Sep10ValidationError("manageData value must contain cryptographic challenge nonce");
  }

  // 8. Signatures: Must contain valid server signature
  const serverKeypair = StellarSdk.Keypair.fromPublicKey(serverSigningKey);
  const clientKeypair = StellarSdk.Keypair.fromPublicKey(clientPublicKey);

  const txHash = tx.hash();

  const hasServerSig = tx.signatures.some((sig) => {
    try {
      return serverKeypair.verify(txHash, sig.signature());
    } catch {
      return false;
    }
  });

  if (!hasServerSig) {
    throw new Sep10ValidationError("Missing or invalid server signature on challenge transaction");
  }

  // 9. Signatures: Must contain valid client signature
  const hasClientSig = tx.signatures.some((sig) => {
    try {
      return clientKeypair.verify(txHash, sig.signature());
    } catch {
      return false;
    }
  });

  if (!hasClientSig) {
    throw new Sep10ValidationError("Missing or invalid client signature on challenge transaction");
  }

  return {
    isValid: true,
    clientPublicKey,
    homeDomain,
    nonce,
    minTime,
    maxTime,
  };
}

module.exports = {
  validateSep10Challenge,
  Sep10ValidationError,
};

