export enum PorterAppEventType {
    BUILD = "BUILD",
    DEPLOY = "DEPLOY",
    APP_EVENT = "APP_EVENT",
    PRE_DEPLOY = "PRE_DEPLOY",
}
export interface PorterAppEvent {
    created_at: string;
    updated_at: string;
    id: string;
    status: string;
    type: PorterAppEventType;
    type_source: string;
    porter_app_id: number;
    metadata: any;
}
export interface PorterAppDeployEvent extends PorterAppEvent {
    type: PorterAppEventType.DEPLOY;
    metadata: {
        image_tag: string;
        revision: number;
        service_status: Record<string, string>;
    };
}
