"use strict";

const { z } = require("zod");
const { StrKey } = require("@stellar/stellar-sdk");

const stellarAddressSchema = z.string().refine((val) => StrKey.isValidEd25519PublicKey(val), {
  message: "Invalid Stellar public key format",
});

const positiveAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a positive number with at most 7 decimal places")
  .refine((val) => parseFloat(val) > 0, {
    message: "Amount must be greater than zero",
  });

const sep24DepositInteractiveSchema = z.object({
  asset_code: z.string().min(1).max(12).regex(/^[a-zA-Z0-9]+$/, "Asset code must be alphanumeric"),
  account: stellarAddressSchema,
  amount: positiveAmountSchema.optional(),
  claimable_balance_supported: z.boolean().optional(),
  wallet_name: z.string().max(100).optional(),
  wallet_url: z.string().url("wallet_url must be a valid URL").optional(),
  lang: z.string().length(2).optional(),
});

const sep24WithdrawInteractiveSchema = z.object({
  asset_code: z.string().min(1).max(12).regex(/^[a-zA-Z0-9]+$/, "Asset code must be alphanumeric"),
  account: stellarAddressSchema,
  amount: positiveAmountSchema.optional(),
  type: z.string().max(50).optional(),
  wallet_name: z.string().max(100).optional(),
  wallet_url: z.string().url("wallet_url must be a valid URL").optional(),
  lang: z.string().length(2).optional(),
});

const sep24InfoResponseSchema = z.object({
  deposit: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      fee_fixed: z.number().nonnegative().optional(),
      fee_percent: z.number().min(0).max(100).optional(),
      min_amount: z.number().nonnegative().optional(),
      max_amount: z.number().positive().optional(),
    })
  ),
  withdraw: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      fee_fixed: z.number().nonnegative().optional(),
      fee_percent: z.number().min(0).max(100).optional(),
      min_amount: z.number().nonnegative().optional(),
      max_amount: z.number().positive().optional(),
    })
  ),
  fee: z.object({ enabled: z.boolean() }).optional(),
});

module.exports = {
  sep24DepositInteractiveSchema,
  sep24WithdrawInteractiveSchema,
  sep24InfoResponseSchema,
  stellarAddressSchema,
  positiveAmountSchema,
};
