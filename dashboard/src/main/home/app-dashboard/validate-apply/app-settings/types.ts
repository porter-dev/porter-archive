import { z } from "zod";

export const populatedEnvGroup = z.object({
  name: z.string(),
  type: z.string(),
  latest_version: z.coerce.bigint(),
  variables: z.record(z.string()).optional().default({}),
  secret_variables: z.record(z.string()).optional().default({}),
  linked_applications: z.array(z.string()).optional(),
  created_at: z.string(),
});
export type PopulatedEnvGroup = z.infer<typeof populatedEnvGroup>;
