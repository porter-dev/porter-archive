import { z } from "zod";

export const buildConfigSchema = z.object({
  builder: z.string(),
  buildpacks: z.array(z.string()),
  config: z.record(z.any()).optional(),
});
export type BuildConfig = z.infer<typeof buildConfigSchema>;

export const buildpackSchema = z.object({
  name: z.string(),
  buildpack: z.string(),
  config: z.record(z.any()).nullish(),
});
export type Buildpack = z.infer<typeof buildpackSchema>;

export const detectedBuildpackSchema = z.object({
  name: z.string(),
  builders: z.array(z.string()),
  detected: z.array(buildpackSchema),
  others: z.array(buildpackSchema),
  buildConfig: buildConfigSchema.optional(),
});
export type DetectedBuildpack = z.infer<typeof detectedBuildpackSchema>;

export const DEFAULT_BUILDER_NAME = "heroku";
export const DEFAULT_PAKETO_STACK = "paketobuildpacks/builder-jammy-full:latest";
export const DEFAULT_HEROKU_STACK = "heroku/builder:22";

export const BUILDPACK_TO_NAME: { [key: string]: string } = {
  "heroku/nodejs": "NodeJS",
  "heroku/python": "Python",
  "heroku/java": "Java",
  "heroku/ruby": "Ruby",
  "heroku/go": "Go",
};
