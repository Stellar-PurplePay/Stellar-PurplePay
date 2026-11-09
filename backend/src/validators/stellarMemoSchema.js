"use strict";

const { z } = require("zod");

const U64_MAX = 18446744073709551615n;
const HEX_32_REGEX = /^[0-9a-fA-F]{64}$/;
const UINT_REGEX = /^\d+$/;

/**
 * Zod schema defining Stellar transaction memo validation conforming to Stellar protocol limits.
 * - none: empty or omitted
 * - text: UTF-8 string up to 28 bytes
 * - id: 64-bit unsigned integer string (0 <= n <= 2^64 - 1)
 * - hash: 32-byte hash as 64-char hex string
 * - return: 32-byte refund/return hash as 64-char hex string
 */
const stellarMemoSchema = z
  .object({
    type: z.enum(["none", "text", "id", "hash", "return"]),
    value: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    const { type, value } = data;
    const cleanValue = value ? value.trim() : "";

    switch (type) {
      case "none":
        // Valid by definition
        break;

      case "text": {
        const byteLen = Buffer.byteLength(cleanValue, "utf8");
        if (byteLen > 28) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `MEMO_TEXT exceeds 28 bytes maximum (received ${byteLen} bytes)`,
            path: ["value"],
          });
        }
        break;
      }

      case "id": {
        if (!cleanValue || !UINT_REGEX.test(cleanValue)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "MEMO_ID must be an unsigned 64-bit integer digit string",
            path: ["value"],
          });
          return;
        }
        try {
          const num = BigInt(cleanValue);
          if (num < 0n || num > U64_MAX) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "MEMO_ID value exceeds 64-bit unsigned integer boundary (0 to 18446744073709551615)",
              path: ["value"],
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "MEMO_ID cannot be parsed as a 64-bit integer",
            path: ["value"],
          });
        }
        break;
      }

      case "hash":
      case "return": {
        if (!cleanValue || !HEX_32_REGEX.test(cleanValue)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `MEMO_${type.toUpperCase()} must be a valid 32-byte hexadecimal string (64 characters)`,
            path: ["value"],
          });
        }
        break;
      }

      default:
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported memo type: ${type}`,
          path: ["type"],
        });
    }
  });

/**
 * Validates a memo payload safely.
 * @param {unknown} input - Object containing type and optional value.
 * @returns {{ success: boolean, data?: { type: string, value: string }, error?: string }}
 */
function validateMemo(input) {
  const result = stellarMemoSchema.safeParse(input);
  if (!result.success) {
    const errorMsg = result.error.issues.map((i) => i.message).join("; ");
    return { success: false, error: errorMsg };
  }
  return { success: true, data: result.data };
}

module.exports = {
  stellarMemoSchema,
  validateMemo,
};
