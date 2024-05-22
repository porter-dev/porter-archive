import { z } from "zod";

export const envGroupFormValidator = z.object({
  name: z
    .string()
    .min(1, { message: "A service name is required" })
    .max(30)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Lowercase letters, numbers, and " - " only.',
    }),
  envVariables: z.array(
    z.object({
      key: z.string().min(1, { message: "Key cannot be empty" }),
      value: z.string().min(1, { message: "Value cannot be empty" }),
      deleted: z.boolean(),
      hidden: z.boolean(),
      locked: z.boolean(),
    })
  ),
  envFiles: z.array(
    z.object({
      name: z.string().min(1, { message: "File name cannot be empty" }),
      contents: z.string().min(1, { message: "File cannot be empty" }),
    })
  ),
});

export type EnvGroupFormData = z.infer<typeof envGroupFormValidator>;

export const envGroupValidator = z.object({
  name: z.string(),
  variables: z.record(z.string()).optional().default({}),
  secret_variables: z.record(z.string()).optional().default({}),
  created_at: z.string(),
  linked_applications: z.array(z.string()).optional().default([]),
  files: z
    .array(
      z.object({
        name: z.string(),
        contents: z.string(),
      })
    )
    .optional()
    .default([]),
  type: z
    .string()
    .pipe(
      z
        .enum(["UNKNOWN", "datastore", "doppler", "porter", "infisical"])
        .catch("UNKNOWN")
    ),
});

export type ClientEnvGroup = z.infer<typeof envGroupValidator>;
