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

export type UsageMetric = z.infer<typeof UsageMetricValidator>;
export const UsageMetricValidator = z.object({
  starting_on: z.string(),
  ending_on: z.string(),
  value: z.number(),
});

export type UsageList = Usage[];
export type Usage = z.infer<typeof UsageValidator>;
export const UsageValidator = z.object({
  metric_name: z.string(),
  usage_metrics: z.array(UsageMetricValidator),
});

export type CreditGrants = z.infer<typeof CreditGrantsValidator>;
export const CreditGrantsValidator = z.object({
  granted_credits: z.number(),
  remaining_credits: z.number(),
});

export const ClientSecretResponse = z.string();
