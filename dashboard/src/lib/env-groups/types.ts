import { z } from "zod";

export const envGroupValidator = z.object({
  name: z.string(),
  created_at: z.string().default(""),
  latest_version: z.number(),
  variables: z.record(z.string()),
  secret_variables: z.record(z.string()).optional(),
});
export type EnvGroup = z.infer<typeof envGroupValidator>;

export const envGroupListResponseValidator = z.object({
  envGroups: envGroupValidator.array(),
});

export const envGroupFormValidator = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .regex(/^[a-z0-9-]+$/, {
      message: "Lowercase letters, numbers, and “-” only.",
    }),
  clusterId: z.number(),
});
export type EnvGroupFormData = z.infer<typeof envGroupFormValidator>;