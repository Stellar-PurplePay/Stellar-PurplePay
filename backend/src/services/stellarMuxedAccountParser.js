"use strict";

const StellarSdk = require("@stellar/stellar-sdk");

const U64_MAX = 18446744073709551615n;
const UINT_REGEX = /^\d+$/;

/**
 * Service to parse, validate, encode, and decode Stellar Muxed Accounts (SEP-0023 / CAP-0027).
 * Allows routing payments to virtual sub-accounts on a single master Stellar account.
 */
class StellarMuxedAccountParser {
  /**
   * Checks if an address is a valid SEP-0023 M-address.
   * @param {string} address
   * @returns {boolean}
   */
  static isMuxedAddress(address) {
    if (typeof address !== "string" || !address.startsWith("M")) {
      return false;
    }
    return StellarSdk.StrKey.isValidMed25519PublicKey(address);
  }

  /**
   * Checks if an address is a standard Ed25519 G-address.
   * @param {string} address
   * @returns {boolean}
   */
  static isBaseAddress(address) {
    if (typeof address !== "string" || !address.startsWith("G")) {
      return false;
    }
    return StellarSdk.StrKey.isValidEd25519PublicKey(address);
  }

  /**
   * Parses any Stellar address (G... or M...) and returns its constituent base account and sub-account ID.
   * @param {string} address
   * @returns {{
   *   isValid: boolean,
   *   isMuxed: boolean,
   *   baseAddress: string | null,
   *   subAccountId: string | null,
   *   error?: string
   * }}
   */
  static parseAddress(address) {
    if (typeof address !== "string" || !address.trim()) {
      return {
        isValid: false,
        isMuxed: false,
        baseAddress: null,
        subAccountId: null,
        error: "Address must be a non-empty string",
      };
    }

    const trimmed = address.trim();

    if (this.isMuxedAddress(trimmed)) {
      try {
        const parsed = StellarSdk.MuxedAccount.fromAddress(trimmed, "0");
        return {
          isValid: true,
          isMuxed: true,
          baseAddress: parsed.baseAccount().accountId(),
          subAccountId: parsed.id(),
        };
      } catch (err) {
        return {
          isValid: false,
          isMuxed: true,
          baseAddress: null,
          subAccountId: null,
          error: `Failed to parse muxed address: ${err.message}`,
        };
      }
    }

    if (this.isBaseAddress(trimmed)) {
      return {
        isValid: true,
        isMuxed: false,
        baseAddress: trimmed,
        subAccountId: null,
      };
    }

    return {
      isValid: false,
      isMuxed: false,
      baseAddress: null,
      subAccountId: null,
      error: "Invalid Stellar address format (expected valid G... or M... address)",
    };
  }

  /**
   * Encodes a base G-address and 64-bit sub-account ID into an M-address.
   * @param {string} baseGAddress
   * @param {string | number | bigint} subAccountId
   * @returns {string} The encoded M... address
   */
  static encodeMuxedAddress(baseGAddress, subAccountId) {
    if (!this.isBaseAddress(baseGAddress)) {
      throw new Error(`Invalid base Stellar G-address: ${baseGAddress}`);
    }

    const idStr = String(subAccountId).trim();
    if (!UINT_REGEX.test(idStr)) {
      throw new Error("Sub-account ID must be an unsigned integer");
    }

    const idBigInt = BigInt(idStr);
    if (idBigInt < 0n || idBigInt > U64_MAX) {
      throw new Error("Sub-account ID exceeds 64-bit unsigned integer range");
    }

    const account = new StellarSdk.Account(baseGAddress, "0");
    const muxed = new StellarSdk.MuxedAccount(account, idStr);
    return muxed.accountId();
  }
}

module.exports = StellarMuxedAccountParser;
