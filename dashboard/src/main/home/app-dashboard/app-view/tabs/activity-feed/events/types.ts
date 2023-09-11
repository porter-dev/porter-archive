import { z } from "zod";

export enum PorterAppEventType {
    BUILD = "BUILD",
    DEPLOY = "DEPLOY",
    APP_EVENT = "APP_EVENT",
    PRE_DEPLOY = "PRE_DEPLOY",
}
const porterAppAppEventMetadataValidator = z.object({
    namespace: z.string(),
    summary: z.string(),
    short_summary: z.string(),
    detail: z.string(),
    service_name: z.string(),
    app_revision_id: z.string(),
    app_name: z.string(),
    app_id: z.string(),
    agent_event_id: z.string(),
});
const porterAppDeployEventMetadataValidator = z.object({
    image_tag: z.string(),
    revision: z.number(),
    app_revision_id: z.string(),
    service_deployment_metadata: z.record(z.object({
        status: z.string(),
        type: z.string(),
    })),
});
const porterAppBuildEventMetadataValidator = z.object({
    org: z.string(),
    repo: z.string(),
    branch: z.string(),
    action_run_id: z.string(),
    github_account_id: z.string(),
})
export const porterAppEventValidator = z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    status: z.string().optional().default(""),
    type: z.nativeEnum(PorterAppEventType),
    type_external_source: z.string().optional().default(""),
    porter_app_id: z.number(),
    metadata: z.union([
        porterAppAppEventMetadataValidator,
        porterAppDeployEventMetadataValidator,
        porterAppBuildEventMetadataValidator,
    ]).optional(),
}).refine((data) => {
    if (data.type === PorterAppEventType.APP_EVENT) {
        return porterAppAppEventMetadataValidator.safeParse(data.metadata).success;
    }
    if (data.type === PorterAppEventType.DEPLOY) {
        return porterAppDeployEventMetadataValidator.safeParse(data.metadata).success;
    }
    if (data.type === PorterAppEventType.BUILD) {
        return porterAppBuildEventMetadataValidator.safeParse(data.metadata).success;
    }
    return true;
});

export const getPorterAppEventsValidator = z.array(porterAppEventValidator).optional().default([]);

export type PorterAppEvent = z.infer<typeof porterAppEventValidator>;
// TODO: figure out how to type this easier
export type PorterAppAppEvent = Omit<PorterAppEvent, 'metadata'> & { type: PorterAppEventType.APP_EVENT, metadata: z.infer<typeof porterAppAppEventMetadataValidator> };
export type PorterAppDeployEvent = Omit<PorterAppEvent, 'metadata'> & { type: PorterAppEventType.DEPLOY, metadata: z.infer<typeof porterAppDeployEventMetadataValidator> };
export type PorterAppBuildEvent = Omit<PorterAppEvent, 'metadata'> & { type: PorterAppEventType.BUILD, metadata: z.infer<typeof porterAppBuildEventMetadataValidator> };
// interface PorterAppServiceDeploymentMetadata {
//     status: string;
//     external_uri: string;
//     type: string;
// }
// export interface PorterAppDeployEvent extends PorterAppEvent {
//     type: PorterAppEventType.DEPLOY;
//     metadata: {
//         image_tag: string;
//         revision: number;
//         service_deployment_metadata: Record<string, PorterAppServiceDeploymentMetadata>;
//     };
// }
// export interface PorterAppAppEvent extends PorterAppEvent {
//     type: PorterAppEventType.APP_EVENT;
//     metadata: {
//         image_tag: string;
//         revision: number;
//         service_deployment_metadata: Record<string, PorterAppServiceDeploymentMetadata>;
//     };
// }