"use strict";

const { Keypair, StrKey, TransactionBuilder, Networks } = require("@stellar/stellar-sdk");

class Sep7ValidationError extends Error {
  constructor(message, code = "SEP7_VALIDATION_ERROR") {
    super(message);
    this.name = "Sep7ValidationError";
    this.code = code;
  }
}

/**
 * Returns the canonical payload string that SEP-0007 specifies for signature generation.
 * Per SEP-0007, the payload to sign is the URI up to (but not including) &signature=...
 * @param {string} uriWithoutSignature
 * @returns {Buffer}
 */
function getSep7SigningPayload(uriWithoutSignature) {
  return Buffer.from(uriWithoutSignature, "utf8");
}

/**
 * Generates a SEP-0007 transaction URI signed with an origin Keypair.
 *
 * @param {object} params
 * @param {string} params.xdr - Base64 encoded TransactionEnvelope XDR
 * @param {string} [params.callback] - URL callback for wallet to POST result
 * @param {Keypair} params.originKeypair - Keypair signing the URI
 * @returns {string} web+stellar:tx?...
 */
function buildSignedSep7TxUri({ xdr, callback, originKeypair }) {
  if (!xdr) {
    throw new Sep7ValidationError("xdr is required", "MISSING_XDR");
  }
  if (!originKeypair || typeof originKeypair.sign !== "function") {
    throw new Sep7ValidationError("Valid originKeypair is required for signing SEP-0007 URI", "INVALID_KEYPAIR");
  }

  const queryParams = new URLSearchParams();
  queryParams.set("xdr", xdr);
  if (callback) {
    queryParams.set("callback", callback);
  }

  const uriWithoutSig = `web+stellar:tx?${queryParams.toString()}`;
  const payload = getSep7SigningPayload(uriWithoutSig);
  const signatureBytes = originKeypair.sign(payload);
  const signatureBase64 = signatureBytes.toString("base64");

  return `${uriWithoutSig}&signature=${encodeURIComponent(signatureBase64)}`;
}

/**
 * Parses and cryptographically validates a signed SEP-0007 URI.
 *
 * @param {string} uriString
 * @param {string} expectedSignerPublicKey
 * @returns {{ operation: string, xdr: string, callback?: string, isValid: boolean }}
 */
function verifySep7Uri(uriString, expectedSignerPublicKey) {
  if (!uriString || !uriString.startsWith("web+stellar:")) {
    throw new Sep7ValidationError("Invalid SEP-0007 scheme: URI must start with 'web+stellar:'", "INVALID_SCHEME");
  }
  if (!StrKey.isValidEd25519PublicKey(expectedSignerPublicKey)) {
    throw new Sep7ValidationError("Invalid expectedSignerPublicKey format", "INVALID_SIGNER_KEY");
  }

  const questionIdx = uriString.indexOf("?");
  if (questionIdx === -1) {
    throw new Sep7ValidationError("URI missing query parameters", "MISSING_QUERY");
  }

  const operation = uriString.slice("web+stellar:".length, questionIdx);
  const sigMatch = uriString.match(/&signature=([^&]+)/);
  if (!sigMatch) {
    throw new Sep7ValidationError("Missing required &signature parameter in SEP-0007 URI", "MISSING_SIGNATURE");
  }

  const signatureBase64 = decodeURIComponent(sigMatch[1]);
  const unsignedUri = uriString.replace(/&signature=[^&]+/, "");
  const payload = getSep7SigningPayload(unsignedUri);

  const keypair = Keypair.fromPublicKey(expectedSignerPublicKey);
  let isValid = false;
  try {
    const signatureBuffer = Buffer.from(signatureBase64, "base64");
    isValid = keypair.verify(payload, signatureBuffer);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    throw new Sep7ValidationError(
      "Cryptographic signature verification failed: payload was tampered with or signed by unknown key",
      "SIGNATURE_MISMATCH"
    );
  }

  const searchParams = new URLSearchParams(uriString.slice(questionIdx + 1));
  const xdr = searchParams.get("xdr");
  const callback = searchParams.get("callback") || undefined;

  return {
    operation,
    xdr,
    callback,
    isValid: true,
  };
}

module.exports = {
  buildSignedSep7TxUri,
  verifySep7Uri,
  Sep7ValidationError,
};
