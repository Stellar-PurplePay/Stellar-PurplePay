"use strict";

const { buildSignedSep7TxUri, verifySep7Uri, Sep7ValidationError } = require("./sep7Validator");
const { Keypair } = require("@stellar/stellar-sdk");

describe("sep7Validator", () => {
  const originKeypair = Keypair.random();
  const sampleXdr = "AAAAAFakeXDRPayloadBase64StringForSEP7Verification==";

  it("builds a valid signed SEP-0007 URI and verifies successfully", () => {
    const uri = buildSignedSep7TxUri({
      xdr: sampleXdr,
      callback: "https://purplepay.org/api/callbacks/tx",
      originKeypair,
    });

    expect(uri.startsWith("web+stellar:tx?")).toBe(true);
    expect(uri).toContain("&signature=");

    const result = verifySep7Uri(uri, originKeypair.publicKey());
    expect(result.isValid).toBe(true);
    expect(result.xdr).toBe(sampleXdr);
    expect(result.callback).toBe("https://purplepay.org/api/callbacks/tx");
    expect(result.operation).toBe("tx");
  });

  it("rejects URI when signed with different keypair than expected", () => {
    const uri = buildSignedSep7TxUri({
      xdr: sampleXdr,
      originKeypair,
    });

    const differentKeypair = Keypair.random();
    expect(() => verifySep7Uri(uri, differentKeypair.publicKey())).toThrow(
      Sep7ValidationError
    );
    expect(() => verifySep7Uri(uri, differentKeypair.publicKey())).toThrow(
      /Cryptographic signature verification failed/
    );
  });

  it("rejects URI when query parameters have been tampered with", () => {
    const uri = buildSignedSep7TxUri({
      xdr: sampleXdr,
      originKeypair,
    });

    const tamperedUri = uri.replace("AAAAAFake", "AAAAATampered");
    expect(() => verifySep7Uri(tamperedUri, originKeypair.publicKey())).toThrow(
      /Cryptographic signature verification failed/
    );
  });

  it("rejects non-SEP-0007 URI scheme", () => {
    expect(() => verifySep7Uri("https://example.com", originKeypair.publicKey())).toThrow(
      /Invalid SEP-0007 scheme/
    );
  });
});
