"use strict";

const axios = require("axios");
const { StrKey } = require("@stellar/stellar-sdk");

const FEDERATION_PATTERN = /^([a-zA-Z0-9._%+-]+)\*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;

/**
 * Resolves SEP-0002 Stellar federated address to destination account ID and memo.
 *
 * @param {string} federatedAddress - e.g. "alice*example.com"
 * @param {object} [httpClient] - Optional injectable HTTP client for testing
 * @returns {Promise<{ account_id: string, memo_type?: string, memo?: string }>}
 */
async function resolveFederatedAddress(federatedAddress, httpClient = axios) {
  if (!federatedAddress || typeof federatedAddress !== "string") {
    throw new Error("Federated address must be a non-empty string");
  }

  const trimmed = federatedAddress.trim();
  const match = trimmed.match(FEDERATION_PATTERN);
  if (!match) {
    throw new Error(`Invalid federated address format: "${trimmed}". Expected username*domain.tld`);
  }

  const [, username, domain] = match;

  // 1. Fetch stellar.toml to discover FEDERATION_SERVER
  const tomlUrl = `https://${domain}/.well-known/stellar.toml`;
  let federationServerUrl;

  try {
    const tomlRes = await httpClient.get(tomlUrl, { timeout: 5000 });
    const tomlText = String(tomlRes.data || "");
    const serverMatch = tomlText.match(/FEDERATION_SERVER\s*=\s*["']([^"']+)["']/i);
    if (!serverMatch) {
      throw new Error(`stellar.toml at ${domain} does not define FEDERATION_SERVER`);
    }
    federationServerUrl = serverMatch[1];
  } catch (err) {
    throw new Error(`Failed to fetch stellar.toml from ${domain}: ${err.message}`);
  }

  // 2. Query FEDERATION_SERVER for address resolution
  try {
    const queryUrl = `${federationServerUrl}${federationServerUrl.includes("?") ? "&" : "?"}q=${encodeURIComponent(
      trimmed
    )}&type=name`;
    const res = await httpClient.get(queryUrl, { timeout: 5000 });
    const data = res.data;

    if (!data || !data.account_id) {
      throw new Error(`Federation server did not return an account_id for ${trimmed}`);
    }

    if (!StrKey.isValidEd25519PublicKey(data.account_id)) {
      throw new Error(`Federation server returned invalid Ed25519 account ID: ${data.account_id}`);
    }

    return {
      account_id: data.account_id,
      memo_type: data.memo_type || undefined,
      memo: data.memo || undefined,
    };
  } catch (err) {
    throw new Error(`Federation resolution failed for ${trimmed}: ${err.message}`);
  }
}

/**
 * Performs reverse federation lookup resolving account_id back to federated handle.
 *
 * @param {string} accountId - Ed25519 public key (G...)
 * @param {string} federationServerUrl - Base federation URL
 * @param {object} [httpClient] - Optional injectable HTTP client
 * @returns {Promise<{ stellar_address: string }>}
 */
async function reverseResolveFederatedAddress(accountId, federationServerUrl, httpClient = axios) {
  if (!StrKey.isValidEd25519PublicKey(accountId)) {
    throw new Error(`Invalid Ed25519 public key: ${accountId}`);
  }

  if (!federationServerUrl || typeof federationServerUrl !== "string") {
    throw new Error("Federation server URL must be specified");
  }

  try {
    const queryUrl = `${federationServerUrl}${federationServerUrl.includes("?") ? "&" : "?"}q=${encodeURIComponent(
      accountId
    )}&type=id`;
    const res = await httpClient.get(queryUrl, { timeout: 5000 });
    const data = res.data;

    if (!data || !data.stellar_address) {
      throw new Error(`Reverse federation did not return a stellar_address for ${accountId}`);
    }

    return {
      stellar_address: data.stellar_address,
    };
  } catch (err) {
    throw new Error(`Reverse federation lookup failed for ${accountId}: ${err.message}`);
  }
}

module.exports = {
  resolveFederatedAddress,
  reverseResolveFederatedAddress,
  FEDERATION_PATTERN,
};
