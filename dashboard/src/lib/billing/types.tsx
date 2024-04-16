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

export type UsageList = Usage[];
export type Usage = z.infer<typeof Usage>;
export const Usage = z.object({
  starting_on: z.string(),
  ending_on: z.string(),
  value: z.number(),
});

export type CreditGrants = z.infer<typeof CreditGrantsValidator>;
export const CreditGrantsValidator = z.object({
  granted_credits: z.number(),
  remaining_credits: z.number(),
});

export const ClientSecretResponse = z.string();
