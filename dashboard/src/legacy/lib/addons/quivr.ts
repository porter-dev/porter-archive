import { z } from "zod";

export const quivrConfigValidator = z.object({
  type: z.literal("quivr"),
  exposedToExternalTraffic: z.boolean().default(true),
  porterDomain: z.string().default(""),
  customDomain: z.string().default(""),
  openAiApiKey: z.string().nonempty().default("*******"),
  supabaseUrl: z.string().nonempty().default("https://*******.supabase.co"),
  supabaseServiceKey: z.string().nonempty().default("*******"),
  pgDatabaseUrl: z
    .string()
    .nonempty()
    .default("postgres://postgres:postgres@localhost:5432/quivr"),
  jwtSecretKey: z.string().nonempty().default("*******"),
  quivrDomain: z.string().nonempty().default("https://*******.quivr.co"),
  anthropicApiKey: z.string().nonempty().default("*******"),
  cohereApiKey: z.string().nonempty().default("*******"),
});
export type QuivrConfigValidator = z.infer<typeof quivrConfigValidator>;
