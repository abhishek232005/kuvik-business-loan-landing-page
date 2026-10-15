import { z } from "zod";

export const mobileField = z
  .string()
  .trim()
  .min(10)
  .max(13)
  .regex(/^(?:\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number.");

export const sendOtpSchema = z.object({
  mobile: mobileField,
  consent: z.literal(true, {
    errorMap: () => ({ message: "Consent is required to continue." }),
  }),
}).strict();

export const verifyOtpSchema = z.object({
  mobile: mobileField,
  otp: z.string().regex(/^\d{4}$/, "Enter the 4-digit verification code."),
}).strict();

export const createBusinessLoanSchema = z.object({
  name: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M} .'-]+$/u, "Enter a valid name."),
  mobile: mobileField,
  consent: z.literal(true, {
    errorMap: () => ({ message: "Consent is required to continue." }),
  }),
}).strict();

export const updateBusinessLoanSchema = z.object({
  businessName: z.string().trim().min(2).max(120)
    .regex(/^[\p{L}\p{M}\d .&'(),/-]+$/u, "Enter a valid business name."),
  businessType: z.enum([
    "sole_proprietorship",
    "partnership",
    "llp",
    "private_limited",
    "public_limited",
    "other",
  ]),
  businessVintage: z.enum(["under_1_year", "1_to_3_years", "3_to_5_years", "over_5_years"]),
  monthlyRevenue: z.number().int().min(1).max(999999999999).nullable(),
  financingPurpose: z.enum([
    "working_capital",
    "equipment",
    "expansion",
    "inventory",
    "operational_expenses",
    "other",
  ]),
  requestedAmount: z.number().int().min(10000).max(999999999999),
  city: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M} .'-]+$/u, "Enter a valid city."),
  state: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M} .'-]+$/u, "Enter a valid state."),
}).strict();
