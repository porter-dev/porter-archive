import { z } from "zod";

const modelUrlValidator = z.object({
  url: z.string().nonempty(),
});
export const deepgramConfigValidator = z.object({
  type: z.literal("deepgram"),
  deepgramAPIKey: z.string().nonempty().default("*********"),
  quayUsername: z.string().nonempty().default("username"),
  quaySecret: z.string().nonempty().default("secret"),
  quayEmail: z.string().nonempty().default(""),
  releaseTag: z.string().nonempty().default("release-240426"),
  modelUrls: z.array(modelUrlValidator).default([]),
});

export type DeepgramConfigValidator = z.infer<typeof deepgramConfigValidator>;
