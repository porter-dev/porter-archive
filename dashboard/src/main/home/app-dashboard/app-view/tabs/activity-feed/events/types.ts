import { z } from "zod";

export type PorterAppEventType =
  | "BUILD"
  | "DEPLOY"
  | "APP_EVENT"
  | "PRE_DEPLOY";

const porterAppAppEventMetadataValidator = z.object({
  namespace: z.string(),
  summary: z.string(),
  short_summary: z.string(),
  detail: z.string(),
  service_name: z.string(),
  app_revision_id: z.string(),
  app_name: z.string(),
  app_id: z.string(),
  agent_event_id: z.number(),
});
const porterAppDeployEventMetadataValidator = z.object({
  image_tag: z.string().optional(),
  app_revision_id: z.string(),
  rollback_target_app_revision_id: z.string().optional(),
  rollback_target_image_tag: z.string().optional(),
  service_deployment_metadata: z
    .record(
      z.object({
        status: z.string(),
        type: z.string(),
      })
    )
    .optional(),
  end_time: z.string().optional(),
});
const porterAppBuildEventMetadataValidator = z.object({
  repo: z.string().optional(),
  action_run_id: z.number().optional(),
  github_account_id: z.number().optional(),
  end_time: z.string().optional(),
  commit_sha: z.string().optional(),
});
const porterAppPreDeployEventMetadataValidator = z.object({
  start_time: z.string(),
  end_time: z.string().optional(),
  app_revision_id: z.string(),
  image_tag: z.string().optional(), // used by the update flow
  commit_sha: z.string().optional(), // used by the apply flow. TODO: remove this field
});

const serviceNoticationValidator = z.object({
  id: z.string(),
  app_revision_id: z.string(),
  error: z.object({
    code: z.number(),
    summary: z.string(),
    detail: z.string(),
    mitigation_steps: z.string(),
    documentation: z.array(z.string()).default([]),
    should_view_logs: z.boolean(),
  }),
  scope: z.literal("SERVICE"),
  timestamp: z.string(),
  metadata: z.object({
    service_name: z
      .string()
      // this is necessary because the name for the pre-deploy job is called "pre-deploy" by the front-end but predeploy in k8s
      // TODO: standardize the naming of the pre-deploy job: https://linear.app/porter/issue/POR-2119/standardize-naming-of-pre-deploy
      .transform((val) => (val === "predeploy" ? "pre-deploy" : val)),
    deployment: z.discriminatedUnion("status", [
      z.object({
        status: z.literal("PENDING"),
      }),
      z.object({
        status: z.literal("SUCCESS"),
      }),
      z.object({
        status: z.literal("FAILURE"),
      }),
      z.object({
        status: z.literal("UNKNOWN"),
      }),
    ]),
    job_run_id: z.string(),
  }),
});
const revisionNotificationValidator = z.object({
  id: z.string(),
  app_revision_id: z.string(),
  error: z.object({
    code: z.number(),
    summary: z.string(),
    detail: z.string(),
    mitigation_steps: z.string(),
    documentation: z.array(z.string()).default([]),
  }),
  scope: z.literal("REVISION"),
  timestamp: z.string(),
});
const applicationNotificationValidator = z.object({
  id: z.string(),
  app_revision_id: z.string(),
  error: z.object({
    code: z.number(),
    summary: z.string(),
    detail: z.string(),
    mitigation_steps: z.string(),
    documentation: z.array(z.string()).default([]),
  }),
  scope: z.literal("APPLICATION"),
  timestamp: z.string(),
});

export type PorterAppServiceNotification = z.infer<
  typeof serviceNoticationValidator
>;
export const isServiceNotification = (
  notification: PorterAppNotification
): notification is PorterAppServiceNotification => {
  return notification.scope === "SERVICE";
};

export const isApplicationNotification = (
  notification: PorterAppNotification
): notification is z.infer<typeof applicationNotificationValidator> => {
  return notification.scope === "APPLICATION";
};

export const isRevisionNotification = (
  notification: PorterAppNotification
): notification is z.infer<typeof revisionNotificationValidator> => {
  return notification.scope === "REVISION";
};

export const porterAppNotificationEventMetadataValidator = z.discriminatedUnion(
  "scope",
  [
    serviceNoticationValidator,
    revisionNotificationValidator,
    applicationNotificationValidator,
  ]
);
export type PorterAppNotification = z.infer<
  typeof porterAppNotificationEventMetadataValidator
>;
export const porterAppEventValidator = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    status: z.string().optional().default(""),
    type: z.literal("BUILD"),
    type_external_source: z.string().optional().default(""),
    porter_app_id: z.number(),
    metadata: porterAppBuildEventMetadataValidator,
  }),
  z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    status: z.string().optional().default(""),
    type: z.literal("DEPLOY"),
    type_external_source: z.string().optional().default(""),
    porter_app_id: z.number(),
    metadata: porterAppDeployEventMetadataValidator,
  }),
  z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    status: z.string().optional().default(""),
    type: z.literal("PRE_DEPLOY"),
    type_external_source: z.string().optional().default(""),
    porter_app_id: z.number(),
    metadata: porterAppPreDeployEventMetadataValidator,
  }),
  z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    status: z.string().optional().default(""),
    type: z.literal("INITIAL_DEPLOY"),
    type_external_source: z.string().optional().default(""),
    porter_app_id: z.number(),
    metadata: porterAppPreDeployEventMetadataValidator,
  }),
  z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    status: z.string().optional().default(""),
    type: z.literal("APP_EVENT"),
    type_external_source: z.string().optional().default(""),
    porter_app_id: z.number(),
    metadata: porterAppAppEventMetadataValidator,
  }),
  z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    type: z.literal("NOTIFICATION"),
    porter_app_id: z.number(),
    metadata: porterAppNotificationEventMetadataValidator,
  }),
  z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    type: z.literal("AUTO_ROLLBACK"),
    type_external_source: z.string().optional().default(""),
    porter_app_id: z.number(),
    metadata: porterAppDeployEventMetadataValidator,
  }),
]);

export const getPorterAppEventsValidator = z
  .array(porterAppEventValidator)
  .optional()
  .default([]);

export type PorterAppEvent = z.infer<typeof porterAppEventValidator>;
export type PorterAppBuildEvent = PorterAppEvent & { type: "BUILD" };
export type PorterAppDeployEvent = PorterAppEvent & { type: "DEPLOY" };
export type PorterAppPreDeployEvent = PorterAppEvent & { type: "PRE_DEPLOY" };
export type PorterAppInitialDeployEvent = PorterAppEvent & {
  type: "INITIAL_DEPLOY";
};
export type PorterAppAppEvent = PorterAppEvent & { type: "APP_EVENT" };
export type PorterAppNotificationEvent = PorterAppEvent & {
  type: "NOTIFICATION";
};
export type PorterAppRollbackEvent = PorterAppEvent & {
  type: "AUTO_ROLLBACK";
};
