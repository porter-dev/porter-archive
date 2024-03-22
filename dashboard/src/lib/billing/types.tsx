import { z } from "zod";

export type PaymentMethodList = PaymentMethod[];

export type PaymentMethod = z.infer<typeof PaymentMethodValidator>;

export const PaymentMethodValidator = z.object({
  display_brand: z.string(),
  id: z.string(),
  last4: z.string(),
  exp_month: z.number(),
  exp_year: z.number(),
});

export const ClientSecretResponse = z.string();
