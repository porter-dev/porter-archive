import { z } from "zod";

export const appRevisionValidator = z.object({
  status: z.enum([
    "CREATED",
    "AWAITING_BUILD_ARTIFACT",
    "AWAITING_PREDEPLOY",
    "READY_TO_APPLY",
    "DEPLOYED",
    "BUILD_FAILED",
    "BUILD_CANCELED",
    "DEPLOY_FAILED",
  ]),
  b64_app_proto: z.string(),
  revision_number: z.number(),
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  env: z.object({
    name: z.string(),
    latest_version: z.number(),
    variables: z.record(z.string(), z.string()).optional(),
    secrets: z.record(z.string(), z.string()).optional(),
    created_at: z.string(),
  }),
});

export type AppRevision = z.infer<typeof appRevisionValidator>;
