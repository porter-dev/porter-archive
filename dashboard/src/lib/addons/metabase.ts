import { z } from "zod";

export const metabaseConfigValidator = z.object({
  type: z.literal("metabase"),
  exposedToExternalTraffic: z.boolean().default(true),
  porterDomain: z.string().default(""),
  customDomain: z.string().default(""),
  datastore: z
    .object({
      host: z.string().nonempty(),
      port: z.number(),
      databaseName: z.string().nonempty(),
      username: z.string().nonempty(),
      password: z.string().nonempty(),
    })
    .default({
      host: "<host>",
      port: 0,
      databaseName: "<db-name>",
      username: "<username>",
      password: "<password>",
    }),
});
export type MetabaseConfigValidator = z.infer<typeof metabaseConfigValidator>;
