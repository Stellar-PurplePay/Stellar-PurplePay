/**
 * frontend/utils/stellarAccountValidator.ts
 *
 * Cryptographic Stellar address, muxed account, and federation discriminator.
 */

import { StrKey } from "@stellar/stellar-sdk";

export type StellarAddressType = "ed25519" | "muxed" | "contract" | "federated" | "invalid";

export interface AddressValidationResult {
  isValid: boolean;
  type: StellarAddressType;
  normalizedAddress: string;
  error?: string;
}

const FEDERATION_REGEX = /^[a-zA-Z0-9._%+-]+(\*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;

/**
 * Validates and classifies any Stellar account, muxed address, contract ID, or federated handle.
 *
 * @param address - Raw input string from user or input field
 * @returns AddressValidationResult
 */
export function validateStellarAccount(address: string): AddressValidationResult {
  if (!address || typeof address !== "string") {
    return {
      isValid: false,
      type: "invalid",
      normalizedAddress: "",
      error: "Address cannot be empty",
    };
  }

  const trimmed = address.trim();

  // Check G-address (Standard Ed25519 public key)
  if (trimmed.startsWith("G") && trimmed.length === 56) {
    if (StrKey.isValidEd25519PublicKey(trimmed)) {
      return {
        isValid: true,
        type: "ed25519",
        normalizedAddress: trimmed,
      };
    }
    return {
      isValid: false,
      type: "invalid",
      normalizedAddress: trimmed,
      error: "Invalid Ed25519 public key checksum",
    };
  }

  // Check M-address (Muxed account for exchange deposits)
  if (trimmed.startsWith("M") && trimmed.length === 69) {
    if (StrKey.isValidMed25519PublicKey(trimmed)) {
      return {
        isValid: true,
        type: "muxed",
        normalizedAddress: trimmed,
      };
    }
    return {
      isValid: false,
      type: "invalid",
      normalizedAddress: trimmed,
      error: "Invalid Muxed account checksum",
    };
  }

  // Check C-address (Soroban Contract ID)
  if (trimmed.startsWith("C") && trimmed.length === 56) {
    if (StrKey.isValidContract(trimmed)) {
      return {
        isValid: true,
        type: "contract",
        normalizedAddress: trimmed,
      };
    }
    return {
      isValid: false,
      type: "invalid",
      normalizedAddress: trimmed,
      error: "Invalid Soroban contract ID checksum",
    };
  }

  // Check SEP-0002 Federated Address format
  if (trimmed.includes("*")) {
    if (FEDERATION_REGEX.test(trimmed)) {
      return {
        isValid: true,
        type: "federated",
        normalizedAddress: trimmed.toLowerCase(),
      };
    }
    return {
      isValid: false,
      type: "invalid",
      normalizedAddress: trimmed,
      error: "Invalid federation address format (expected user*domain.com)",
    };
  }

  return {
    isValid: false,
    type: "invalid",
    normalizedAddress: trimmed,
    error: "Unrecognized Stellar address format",
  };
}
