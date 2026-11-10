"use strict";

const StellarSdk = require("@stellar/stellar-sdk");
const { validateSep10Challenge, Sep10ValidationError } = require("./sep10Validator");

describe("sep10Validator", () => {
  const networkPassphrase = StellarSdk.Networks.TESTNET;
  const homeDomain = "purplepay.app";

  let serverKeypair;
  let clientKeypair;

  beforeAll(() => {
    serverKeypair = StellarSdk.Keypair.random();
    clientKeypair = StellarSdk.Keypair.random();
  });

  function createValidChallengeTx(overrides = {}) {
    const now = overrides.now !== undefined ? overrides.now : Math.floor(Date.now() / 1000);
    const minTime = overrides.minTime !== undefined ? overrides.minTime : now - 10;
    const maxTime = overrides.maxTime !== undefined ? overrides.maxTime : now + 300;

    const source = overrides.serverKeypair ? overrides.serverKeypair : serverKeypair;
    const client = overrides.clientKeypair ? overrides.clientKeypair : clientKeypair;
    const domain = overrides.homeDomain || homeDomain;

    const serverAccount = new StellarSdk.Account(source.publicKey(), "-1");

    const tx = new StellarSdk.TransactionBuilder(serverAccount, {
      fee: "100",
      networkPassphrase,
      timebounds: {
        minTime: String(minTime),
        maxTime: String(maxTime),
      },
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `${domain} auth`,
          value: Buffer.from("super-random-cryptographic-challenge-nonce-48"),
          source: client.publicKey(),
        })
      )
      .build();

    if (!overrides.skipServerSign) {
      tx.sign(source);
    }
    if (!overrides.skipClientSign) {
      tx.sign(client);
    }

    return tx.toEnvelope().toXDR("base64");
  }

  it("successfully validates a correctly signed SEP-0010 challenge transaction", () => {
    const now = 1700000000;
    const xdr = createValidChallengeTx({ now, minTime: now - 60, maxTime: now + 300 });

    const result = validateSep10Challenge({
      transactionXdr: xdr,
      serverSigningKey: serverKeypair.publicKey(),
      clientPublicKey: clientKeypair.publicKey(),
      networkPassphrase,
      homeDomain,
      nowSeconds: now,
    });

    expect(result.isValid).toBe(true);
    expect(result.clientPublicKey).toBe(clientKeypair.publicKey());
    expect(result.homeDomain).toBe(homeDomain);
    expect(result.nonce).toBeDefined();
    expect(result.minTime).toBe(now - 60);
    expect(result.maxTime).toBe(now + 300);
  });

  it("rejects challenge if client signature is missing", () => {
    const xdr = createValidChallengeTx({ skipClientSign: true });

    expect(() =>
      validateSep10Challenge({
        transactionXdr: xdr,
        serverSigningKey: serverKeypair.publicKey(),
        clientPublicKey: clientKeypair.publicKey(),
        networkPassphrase,
        homeDomain,
      })
    ).toThrow(/Missing or invalid client signature/);
  });

  it("rejects challenge if server signature is missing", () => {
    const xdr = createValidChallengeTx({ skipServerSign: true });

    expect(() =>
      validateSep10Challenge({
        transactionXdr: xdr,
        serverSigningKey: serverKeypair.publicKey(),
        clientPublicKey: clientKeypair.publicKey(),
        networkPassphrase,
        homeDomain,
      })
    ).toThrow(/Missing or invalid server signature/);
  });

  it("rejects challenge transaction that has expired", () => {
    const now = 1700000000;
    const xdr = createValidChallengeTx({ now, minTime: now - 600, maxTime: now - 400 });

    expect(() =>
      validateSep10Challenge({
        transactionXdr: xdr,
        serverSigningKey: serverKeypair.publicKey(),
        clientPublicKey: clientKeypair.publicKey(),
        networkPassphrase,
        homeDomain,
        nowSeconds: now,
        gracePeriodSeconds: 0,
      })
    ).toThrow(/Challenge transaction has expired/);
  });

  it("rejects challenge transaction that is premature", () => {
    const now = 1700000000;
    const xdr = createValidChallengeTx({ now, minTime: now + 500, maxTime: now + 1000 });

    expect(() =>
      validateSep10Challenge({
        transactionXdr: xdr,
        serverSigningKey: serverKeypair.publicKey(),
        clientPublicKey: clientKeypair.publicKey(),
        networkPassphrase,
        homeDomain,
        nowSeconds: now,
        gracePeriodSeconds: 0,
      })
    ).toThrow(/premature/);
  });

  it("rejects challenge transaction if homeDomain does not match", () => {
    const xdr = createValidChallengeTx({ homeDomain: "attacker.io" });

    expect(() =>
      validateSep10Challenge({
        transactionXdr: xdr,
        serverSigningKey: serverKeypair.publicKey(),
        clientPublicKey: clientKeypair.publicKey(),
        networkPassphrase,
        homeDomain: "purplepay.app",
      })
    ).toThrow(/does not match expected/);
  });

  it("rejects invalid public key parameters", () => {
    expect(() =>
      validateSep10Challenge({
        transactionXdr: "AAAA...",
        serverSigningKey: "not-a-key",
        clientPublicKey: clientKeypair.publicKey(),
      })
    ).toThrow(Sep10ValidationError);
  });
});
