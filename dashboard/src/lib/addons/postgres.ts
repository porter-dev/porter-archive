import { z } from "zod";

import { serviceNumberValidator } from "lib/porter-apps/values";

export const postgresConfigValidator = z.object({
  type: z.literal("postgres"),
  cpuCores: serviceNumberValidator.default({
    value: 0.5,
    readOnly: false,
  }),
  ramMegabytes: serviceNumberValidator.default({
    value: 512,
    readOnly: false,
  }),
  storageGigabytes: serviceNumberValidator.default({
    value: 1,
    readOnly: false,
  }),
  username: z.string().default("postgres"),
  password: z.string().default("postgres"),
});
export type PostgresConfig = z.infer<typeof postgresConfigValidator>;

export function defaultPostgresAddon(): PostgresConfig {
  return postgresConfigValidator.parse({
    type: "postgres",
  });
}
