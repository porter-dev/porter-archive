import { z } from "zod";

export const upstashIntegrationValidator = z.object({
  created_at: z.string(),
});
export type ClientUpstashIntegration = z.infer<
  typeof upstashIntegrationValidator
>;
