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
    "PREDEPLOY_FAILED"
  ]),
  b64_app_proto: z.string(),
  revision_number: z.number(),
  deployment_target_id: z.string(),
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AppRevision = z.infer<typeof appRevisionValidator>;
