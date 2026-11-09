"use strict";

const { z } = require("zod");

const STELLAR_PUBKEY_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * Zod schema for milestone deadline extension requests.
 */
const milestoneExtensionSchema = z.object({
  jobId: z
    .string()
    .trim()
    .min(1, "jobId is required and cannot be empty"),
  milestoneId: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: "milestoneId must be a positive integer",
    }),
  extensionSeconds: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val >= 60 && val <= 31_536_000, {
      message: "extensionSeconds must be an integer between 60 seconds and 31,536,000 seconds (1 year)",
    }),
  clientAddress: z
    .string()
    .trim()
    .regex(STELLAR_PUBKEY_REGEX, "clientAddress must be a valid Stellar public key (G...)"),
  reason: z
    .string()
    .trim()
    .max(1000, "reason cannot exceed 1000 characters")
    .optional(),
});

/**
 * Validates extension payload safely.
 * @param {unknown} input
 * @returns {{ success: boolean, data?: z.infer<typeof milestoneExtensionSchema>, error?: string }}
 */
function validateMilestoneExtension(input) {
  const result = milestoneExtensionSchema.safeParse(input);
  if (!result.success) {
    const errorMsg = result.error.issues.map((i) => i.message).join("; ");
    return { success: false, error: errorMsg };
  }
  return { success: true, data: result.data };
}

module.exports = {
  milestoneExtensionSchema,
  validateMilestoneExtension,
};
