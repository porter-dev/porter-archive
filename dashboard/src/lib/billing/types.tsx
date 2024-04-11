import { z } from "zod";

export type PaymentMethodList = PaymentMethod[];
export type PaymentMethod = z.infer<typeof PaymentMethodValidator>;

export const PaymentMethodValidator = z.object({
  display_brand: z.string(),
  id: z.string(),
  last4: z.string(),
  exp_month: z.number(),
  exp_year: z.number(),
  is_default: z.boolean(),
});

type Trial = z.infer<typeof Trial>;

const Trial = z.object({
  ending_before: z.string(),
});

export type Plan = z.infer<typeof Plan>;
export const Plan = z.object({
  id: z.string(),
  plan_name: z.string(),
  plan_description: z.string(),
  starting_on: z.string(),
  trial_info: Trial,
});

export type CreditGrantList = CreditGrant[];
export type CreditGrant = z.infer<typeof CreditGrantValidator>;
export const CreditGrantValidator = z.object({
  id: z.string(),
  name: z.string(),
  balance: z.object({
    excluding_pending: z.number(),
    including_pending: z.number(),
    effective_at: z.string(),
  }),
  reason: z.string(),
  effective_at: z.string(),
  expires_at: z.string(),
});

export const ClientSecretResponse = z.string();
