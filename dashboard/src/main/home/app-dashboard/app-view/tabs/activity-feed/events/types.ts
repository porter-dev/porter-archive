import { z } from "zod";

export type PorterAppEventType = 'BUILD' | 'DEPLOY' | 'APP_EVENT' | 'PRE_DEPLOY';

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
    image_tag: z.string(),
    app_revision_id: z.string(),
    service_deployment_metadata: z.record(z.object({
        status: z.string(),
        type: z.string(),
    })).optional(),
    end_time: z.string().optional(),
});
const porterAppBuildEventMetadataValidator = z.object({
    repo: z.string().optional(),
    action_run_id: z.number().optional(),
    github_account_id: z.number().optional(),
    end_time: z.string().optional(),
    commit_sha: z.string().optional(),
})
const porterAppPreDeployEventMetadataValidator = z.object({
    start_time: z.string(),
    end_time: z.string().optional(),
    app_revision_id: z.string(),
    commit_sha: z.string().optional(),
});
export const porterAppEventValidator = z.discriminatedUnion("type", [
    z.object({
        id: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        status: z.string().optional().default(""),
        type: z.literal("BUILD"),
        type_external_source: z.string().optional().default(""),
        porter_app_id: z.number(),
        metadata: porterAppBuildEventMetadataValidator
    }),
    z.object({
        id: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        status: z.string().optional().default(""),
        type: z.literal("DEPLOY"),
        type_external_source: z.string().optional().default(""),
        porter_app_id: z.number(),
        metadata: porterAppDeployEventMetadataValidator
    }),
    z.object({
        id: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        status: z.string().optional().default(""),
        type: z.literal("PRE_DEPLOY"),
        type_external_source: z.string().optional().default(""),
        porter_app_id: z.number(),
        metadata: porterAppPreDeployEventMetadataValidator
    }),
    z.object({
        id: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        status: z.string().optional().default(""),
        type: z.literal("APP_EVENT"),
        type_external_source: z.string().optional().default(""),
        porter_app_id: z.number(),
        metadata: porterAppAppEventMetadataValidator
    }),
    z.object({
        id: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        type: z.literal("NOTIFICATION"),
        porter_app_id: z.number(),
        metadata: z.any(),
    }),
]);

export const getPorterAppEventsValidator = z.array(porterAppEventValidator).optional().default([]);

export type PorterAppEvent = z.infer<typeof porterAppEventValidator>;
export type PorterAppBuildEvent = PorterAppEvent & { type: 'BUILD' };
export type PorterAppDeployEvent = PorterAppEvent & { type: 'DEPLOY' };
export type PorterAppPreDeployEvent = PorterAppEvent & { type: 'PRE_DEPLOY' };
export type PorterAppAppEvent = PorterAppEvent & { type: 'APP_EVENT' };