import { z } from "zod";

export const neonIntegrationValidator = z.object({
  created_at: z.string(),
});
export type ClientNeonIntegration = z.infer<typeof neonIntegrationValidator>;
