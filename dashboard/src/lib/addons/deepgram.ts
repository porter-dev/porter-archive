import { z } from "zod";

export const deepgramConfigValidator = z.object({
  type: z.literal("deepgram"),
  deepgramAPIKey: z.string().nonempty().default("*********"),
  quayUsername: z.string().nonempty().default("username"),
  quaySecret: z.string().nonempty().default("secret"),
  quayEmail: z.string(),
  instanceType: z.literal("g4dn.xlarge"),
  releaseTag: z.string().nonempty().default("release-240426"),
});

export type DeepgramConfigValidator = z.infer<typeof deepgramConfigValidator>;
