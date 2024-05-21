import { z } from "zod";

export const datadogConfigValidator = z.object({
  type: z.literal("datadog"),
  cpuCores: z.number().default(0.5),
  ramMegabytes: z.number().default(512),
  site: z.string().nonempty().default("datadoghq.com"),
  apiKey: z.string().nonempty().default("*******"),
  loggingEnabled: z.boolean().default(false),
  apmEnabled: z.boolean().default(false),
  dogstatsdEnabled: z.boolean().default(false),
});
export type DatadogConfigValidator = z.infer<typeof datadogConfigValidator>;
