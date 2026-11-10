"use strict";

const express = require("express");
const StellarSdk = require("@stellar/stellar-sdk");
const jwt = require("jsonwebtoken");
const { validateSep10Challenge, Sep10ValidationError } = require("../utils/sep10Validator");
const { globalSep10NonceStore, NonceReplayError } = require("../utils/sep10NonceStore");

const JWT_SECRET = process.env.JWT_SECRET || "stellar-purplepay-sep10-test-secret-2026";
const HOME_DOMAIN = process.env.HOME_DOMAIN || "purplepay.app";
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;

// Ephemeral server keypair for development/testing if STELLAR_SERVER_SECRET is not configured
let defaultServerKeypair;
function getServerKeypair() {
  if (process.env.STELLAR_SERVER_SECRET) {
    try {
      return StellarSdk.Keypair.fromSecret(process.env.STELLAR_SERVER_SECRET);
    } catch {
      // Fallback to cached random keypair
    }
  }
  if (!defaultServerKeypair) {
    defaultServerKeypair = StellarSdk.Keypair.random();
  }
  return defaultServerKeypair;
}

function createSep10AuthRouter(options = {}) {
  const router = express.Router();
  const serverKey = options.serverKeypair || getServerKeypair();
  const homeDomain = options.homeDomain || HOME_DOMAIN;
  const networkPassphrase = options.networkPassphrase || NETWORK_PASSPHRASE;
  const nonceStore = options.nonceStore || globalSep10NonceStore;
  const jwtSecret = options.jwtSecret || JWT_SECRET;

  /**
   * GET /api/auth/sep10/challenge?account=G...
   * Mint a challenge transaction for Freighter or wallet to sign
   */
  router.get("/challenge", (req, res) => {
    const { account } = req.query;

    if (!account || !StellarSdk.StrKey.isValidEd25519PublicKey(account)) {
      return res.status(400).json({
        error: "Valid 'account' query parameter with Stellar public key is required",
      });
    }

    try {
      const serverAccount = new StellarSdk.Account(serverKey.publicKey(), "-1");
      const now = Math.floor(Date.now() / 1000);
      const nonce = (require("crypto").randomBytes(48)).toString("base64");

      const tx = new StellarSdk.TransactionBuilder(serverAccount, {
        fee: "100",
        networkPassphrase,
        timebounds: {
          minTime: String(now - 10),
          maxTime: String(now + 300),
        },
      })
        .addOperation(
          StellarSdk.Operation.manageData({
            name: `${homeDomain} auth`,
            value: Buffer.from(nonce),
            source: account,
          })
        )
        .build();

      tx.sign(serverKey);
      const transactionXdr = tx.toEnvelope().toXDR("base64");

      res.json({
        transaction: transactionXdr,
        network_passphrase: networkPassphrase,
      });
    } catch (err) {
      res.status(500).json({ error: `Failed to build challenge: ${err.message}` });
    }
  });

  /**
   * POST /api/auth/sep10/token
   * Submit client-signed challenge and exchange for session JWT
   */
  router.post("/token", (req, res) => {
    const { transaction } = req.body;

    if (!transaction || typeof transaction !== "string") {
      return res.status(400).json({ error: "Missing 'transaction' in request body" });
    }

    try {
      // Decode transaction to identify client source
      const parsedTx = new StellarSdk.Transaction(transaction, networkPassphrase);
      if (!parsedTx.operations || parsedTx.operations.length === 0) {
        return res.status(400).json({ error: "Transaction contains no operations" });
      }

      const clientPublicKey = parsedTx.operations[0].source;
      if (!clientPublicKey) {
        return res.status(400).json({ error: "Operation 0 source account is required" });
      }

      // 1. Cryptographic validation of SEP-0010 envelope and signatures
      const validation = validateSep10Challenge({
        transactionXdr: transaction,
        serverSigningKey: serverKey.publicKey(),
        clientPublicKey,
        networkPassphrase,
        homeDomain,
      });

      // 2. Anti-replay prevention check
      nonceStore.consumeNonce(validation.nonce, clientPublicKey);

      // 3. Mint scoped JWT token
      const token = jwt.sign(
        {
          sub: clientPublicKey,
          iss: homeDomain,
          auth_method: "SEP-0010",
        },
        jwtSecret,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        account: clientPublicKey,
      });
    } catch (err) {
      if (err instanceof Sep10ValidationError) {
        return res.status(400).json({ error: err.message, code: err.code });
      }
      if (err instanceof NonceReplayError) {
        return res.status(400).json({ error: err.message, code: err.code });
      }
      res.status(400).json({ error: `Verification failed: ${err.message}` });
    }
  });

  return router;
}

module.exports = {
  createSep10AuthRouter,
};

