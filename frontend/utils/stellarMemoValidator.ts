/**
 * frontend/utils/stellarMemoValidator.ts
 *
 * Strict validation for Stellar transaction memo types according to protocol rules.
 */

export type StellarMemoType = "none" | "text" | "id" | "hash" | "return";

export interface MemoValidationResult {
  isValid: boolean;
  byteLength: number;
  error?: string;
}

const UINT64_MAX = 18446744073709551615n;

/**
 * Calculates UTF-8 byte length for any string.
 */
export function getUtf8ByteLength(text: string): number {
  if (!text) return 0;
  return new TextEncoder().encode(text).length;
}

/**
 * Validates a Stellar memo value against its specified memo type.
 *
 * @param type - Memo type ('none', 'text', 'id', 'hash', 'return')
 * @param value - User input value
 * @returns MemoValidationResult
 */
export function validateStellarMemo(type: StellarMemoType, value: string): MemoValidationResult {
  const trimmed = value.trim();
  const byteLength = getUtf8ByteLength(trimmed);

  if (type === "none" || (!trimmed && type === "text")) {
    return {
      isValid: true,
      byteLength: 0,
    };
  }

  switch (type) {
    case "text": {
      if (byteLength > 28) {
        return {
          isValid: false,
          byteLength,
          error: `MEMO_TEXT exceeds 28 bytes maximum (currently ${byteLength} bytes)`,
        };
      }
      return {
        isValid: true,
        byteLength,
      };
    }

    case "id": {
      if (!/^\d+$/.test(trimmed)) {
        return {
          isValid: false,
          byteLength,
          error: "MEMO_ID must be a non-negative unsigned integer",
        };
      }
      try {
        const bigIntVal = BigInt(trimmed);
        if (bigIntVal > UINT64_MAX) {
          return {
            isValid: false,
            byteLength,
            error: "MEMO_ID exceeds maximum 64-bit unsigned integer value",
          };
        }
        return {
          isValid: true,
          byteLength,
        };
      } catch {
        return {
          isValid: false,
          byteLength,
          error: "Invalid numeric format for MEMO_ID",
        };
      }
    }

    case "hash":
    case "return": {
      const typeName = type === "hash" ? "MEMO_HASH" : "MEMO_RETURN";
      if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
        return {
          isValid: false,
          byteLength,
          error: `${typeName} must be a 32-byte hexadecimal string (64 characters)`,
        };
      }
      return {
        isValid: true,
        byteLength: 32,
      };
    }

    default:
      return {
        isValid: false,
        byteLength,
        error: `Unknown memo type: ${type}`,
      };
  }
}
