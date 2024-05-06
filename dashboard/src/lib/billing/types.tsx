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

const TrialValidator = z.object({
  ending_before: z.string(),
});

export type Plan = z.infer<typeof PlanValidator>;
export const PlanValidator = z
  .object({
    id: z.string(),
    plan_name: z.string(),
    plan_description: z.string(),
    starting_on: z.string(),
    trial_info: TrialValidator,
  })
  .nullable();

export type UsageMetric = z.infer<typeof UsageMetricValidator>;
export const UsageMetricValidator = z.object({
  // starting_on and ending_before are RFC 3339 date strings
  // that represent the timeframe where the metric was ingested.
  // If the granularity is set per day, the starting_on field
  // represents the day the metric was ingested.
  starting_on: z.string(),
  ending_before: z.string(),
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

export type CostList = Cost[];
export type Cost = z.infer<typeof CostValidator>;
export const CostValidator = z.object({
  start_timestamp: z.string(),
  end_timestamp: z.string(),
  cost: z.number(),
});

export type InvoiceList = Invoice[];
export type Invoice = z.infer<typeof InvoiceValidator>;
export const InvoiceValidator = z.object({
  hosted_invoice_url: z.string(),
  status: z.string(),
  created: z.string(),
});

export const ClientSecretResponse = z.string();

export type ReferralDetails = z.infer<typeof ReferralDetailsValidator>;
export const ReferralDetailsValidator = z
  .object({
    code: z.string(),
    referral_count: z.number(),
    max_allowed_referrals: z.number(),
  })
  .nullable();
