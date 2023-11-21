import { z } from "zod";

export const appRevisionValidator = z.object({
  status: z.enum([
    "UNKNOWN",
    "CREATED",
    "IMAGE_AVAILABLE",
    "AWAITING_BUILD_ARTIFACT",
    "AWAITING_PREDEPLOY",
    "AWAITING_DEPLOY",
    "PREDEPLOY_PROGRESSING",
    "DEPLOYED",
    "DEPLOYING",
    "BUILD_CANCELED",
    "BUILD_FAILED",
    "BUILD_SUCCESSFUL",
    "PREDEPLOY_FAILED",
    "PREDEPLOY_SUCCESSFUL",
    "DEPLOY_FAILED",
    "APPLY_FAILED",
    "UPDATE_FAILED",
  ]),
  b64_app_proto: z.string(),
  revision_number: z.number(),
  deployment_target_id: z.string(),
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AppRevision = z.infer<typeof appRevisionValidator>;
