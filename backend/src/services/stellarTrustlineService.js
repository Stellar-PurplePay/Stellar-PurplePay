"use strict";

const StellarSdk = require("@stellar/stellar-sdk");

/**
 * Service to verify Stellar asset trustlines prior to executing payouts and escrow releases.
 * Prevents transaction failure due to 'op_no_trust' or insufficient trustline limit.
 */
class StellarTrustlineService {
  constructor(options = {}) {
    this.horizonUrl =
      options.horizonUrl ||
      process.env.STELLAR_HORIZON_URL ||
      "https://horizon-testnet.stellar.org";
    this.server = options.server || new StellarSdk.Horizon.Server(this.horizonUrl);
  }

  /**
   * Verifies if a recipient account has a valid, authorized trustline capable of receiving
   * the specified non-native asset and amount.
   *
   * @param {Object} params
   * @param {string} params.accountAddress - Recipient Stellar public key (G...)
   * @param {string} params.assetCode - Token code (e.g. 'USDC', 'EURC') or 'native'/'XLM'
   * @param {string} [params.assetIssuer] - Asset issuer public key (required for non-native)
   * @param {string | number} [params.amount] - Desired transfer amount to check against available limit
   * @returns {Promise<{
   *   hasTrustline: boolean,
   *   isAuthorized: boolean,
   *   isNative: boolean,
   *   balance: string,
   *   limit: string,
   *   canReceiveAmount: boolean,
   *   reason?: string
   * }>}
   */
  async verifyTrustline({ accountAddress, assetCode, assetIssuer, amount = "0" }) {
    if (!accountAddress || !StellarSdk.StrKey.isValidEd25519PublicKey(accountAddress)) {
      return {
        hasTrustline: false,
        isAuthorized: false,
        isNative: false,
        balance: "0",
        limit: "0",
        canReceiveAmount: false,
        reason: "Invalid recipient Stellar address",
      };
    }

    const upperCode = (assetCode || "XLM").toUpperCase();

    // Native XLM does not require a trustline
    if (upperCode === "NATIVE" || upperCode === "XLM" || !assetIssuer) {
      return {
        hasTrustline: true,
        isAuthorized: true,
        isNative: true,
        balance: "unlimited",
        limit: "unlimited",
        canReceiveAmount: true,
      };
    }

    if (!StellarSdk.StrKey.isValidEd25519PublicKey(assetIssuer)) {
      return {
        hasTrustline: false,
        isAuthorized: false,
        isNative: false,
        balance: "0",
        limit: "0",
        canReceiveAmount: false,
        reason: "Invalid asset issuer address",
      };
    }

    try {
      const account = await this.server.loadAccount(accountAddress);
      const balanceObj = account.balances.find((b) => {
        if (b.asset_type === "native") return false;
        return b.asset_code === upperCode && b.asset_issuer === assetIssuer;
      });

      if (!balanceObj) {
        return {
          hasTrustline: false,
          isAuthorized: false,
          isNative: false,
          balance: "0",
          limit: "0",
          canReceiveAmount: false,
          reason: `Recipient account does not have a trustline for ${upperCode}:${assetIssuer}`,
        };
      }

      const isAuthorized =
        balanceObj.is_authorized !== false && balanceObj.is_authorized_to_maintain_liabilities !== false;

      if (!isAuthorized) {
        return {
          hasTrustline: true,
          isAuthorized: false,
          isNative: false,
          balance: balanceObj.balance,
          limit: balanceObj.limit,
          canReceiveAmount: false,
          reason: `Trustline exists for ${upperCode} but authorization has been revoked by the issuer`,
        };
      }

      const currentBalance = parseFloat(balanceObj.balance) || 0;
      const trustLimit = parseFloat(balanceObj.limit) || 0;
      const incomingAmount = parseFloat(String(amount)) || 0;

      const remainingCapacity = trustLimit - currentBalance;
      const canReceiveAmount = incomingAmount <= 0 || remainingCapacity >= incomingAmount;

      return {
        hasTrustline: true,
        isAuthorized: true,
        isNative: false,
        balance: balanceObj.balance,
        limit: balanceObj.limit,
        canReceiveAmount,
        reason: canReceiveAmount
          ? undefined
          : `Insufficient trustline capacity: available limit is ${remainingCapacity.toFixed(7)}, requested ${incomingAmount}`,
      };
    } catch (err) {
      if (err.name === "NotFoundError" || err?.response?.status === 404) {
        return {
          hasTrustline: false,
          isAuthorized: false,
          isNative: false,
          balance: "0",
          limit: "0",
          canReceiveAmount: false,
          reason: "Recipient account is not funded or does not exist on the Stellar network",
        };
      }

      return {
        hasTrustline: false,
        isAuthorized: false,
        isNative: false,
        balance: "0",
        limit: "0",
        canReceiveAmount: false,
        reason: `Failed to query Horizon network: ${err.message}`,
      };
    }
  }
}

module.exports = StellarTrustlineService;
