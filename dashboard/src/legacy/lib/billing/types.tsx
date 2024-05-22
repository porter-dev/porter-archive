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
    starting_on: z.string(),
    ending_before: z.string(),
    trial_info: TrialValidator,
  })
  .nullable();

export type BillableMetric = z.infer<typeof BillableMetricValidator>;
export const BillableMetricValidator = z.object({
  name: z.string(),
});

export type ChargeUsage = z.infer<typeof ChargeUsageValidator>;
export const ChargeUsageValidator = z.object({
  units: z.string(),
  amount_cents: z.number(),
  amount_currency: z.string(),
  billable_metric: BillableMetricValidator,
});

export type Usage = z.infer<typeof UsageValidator>;
export const UsageValidator = z.object({
  from_datetime: z.string(),
  to_datetime: z.string(),
  total_amount_cents: z.number(),
  charges_usage: z.array(ChargeUsageValidator),
});

export type CreditGrants = z.infer<typeof CreditGrantsValidator>;
export const CreditGrantsValidator = z.object({
  granted_credits: z.number(),
  remaining_credits: z.number(),
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
