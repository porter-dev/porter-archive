import { z } from "zod";

import { buildpackSchema } from "main/home/app-dashboard/types/buildpack";

// buildValidator is used to validate inputs for build setting fields
export const buildValidator = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("pack"),
    context: z.string().min(1).default("./").catch("./"),
    buildpacks: z.array(buildpackSchema).default([]),
    builder: z.string(),
    repo: z.string().optional(),
  }),
  z.object({
    method: z.literal("docker"),
    context: z.string().min(1).default("./").catch("./"),
    dockerfile: z.string().min(1).default("./Dockerfile").catch("./Dockerfile"),
    repo: z.string().optional(),
  }),
]);
export type BuildOptions = z.infer<typeof buildValidator>;
