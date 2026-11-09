"use strict";

const { z } = require("zod");
const { validate } = require("./index");

const STELLAR_PUBKEY_REGEX = /^G[A-Z0-9]{55}$/;
const SOROBAN_CONTRACT_REGEX = /^C[A-Z0-9]{55}$/;
const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;
const DECIMAL_AMOUNT_REGEX = /^\d+(\.\d{1,7})?$/;

const releaseMilestoneSchema = z.object({
  milestoneIndex: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val >= 0 && val <= 50, {
      message: "milestoneIndex must be an integer between 0 and 50",
    }),
  txHash: z.string().optional(),
}).passthrough();

const submitDeliverableSchema = z.object({
  milestoneIndex: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val >= 0 && val <= 50, {
      message: "milestoneIndex must be an integer between 0 and 50",
    }),
  deliverableHash: z
    .string()
    .trim()
    .refine((val) => SHA256_HEX_REGEX.test(val), {
      message: "deliverableHash must be a 64-character hexadecimal SHA-256 string",
    }),
  notes: z.string().max(2000, "notes cannot exceed 2000 characters").optional(),
}).passthrough();

const createEscrowSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  clientAddress: z.string().regex(STELLAR_PUBKEY_REGEX, "Invalid client Stellar address"),
  freelancerAddress: z.string().regex(STELLAR_PUBKEY_REGEX, "Invalid freelancer Stellar address"),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => String(val).trim())
    .refine((val) => DECIMAL_AMOUNT_REGEX.test(val) && parseFloat(val) > 0, {
      message: "amount must be a positive number with at most 7 decimal places",
    }),
  currency: z.enum(["XLM", "USDC"]).default("XLM"),
  contractId: z.string().regex(SOROBAN_CONTRACT_REGEX, "Invalid Soroban contract address").optional(),
}).passthrough();

const disputeEscrowSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Dispute reason must be at least 10 characters long")
    .max(2000, "Dispute reason cannot exceed 2000 characters"),
  evidenceCids: z.array(z.string()).max(10, "At most 10 evidence items allowed").optional(),
}).passthrough();

module.exports = {
  validate,
  STELLAR_PUBKEY_REGEX,
  SOROBAN_CONTRACT_REGEX,
  SHA256_HEX_REGEX,
  releaseMilestoneSchema,
  submitDeliverableSchema,
  createEscrowSchema,
  disputeEscrowSchema,
};
