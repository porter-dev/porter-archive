import { z } from "zod";

export const newrelicConfigValidator = z.object({
  type: z.literal("newrelic"),
  licenseKey: z.string().nonempty().default("*******"),
  insightsKey: z.string().nonempty().default("*******"),
  personalApiKey: z.string().nonempty().default("*******"),
  accountId: z.string().nonempty().default("<account-id>"),
  loggingEnabled: z.boolean().default(false),
  kubeEventsEnabled: z.boolean().default(false),
  metricsAdapterEnabled: z.boolean().default(false),
  prometheusEnabled: z.boolean().default(false),
  pixieEnabled: z.boolean().default(false),
});
export type NewrelicConfigValidator = z.infer<typeof newrelicConfigValidator>;
