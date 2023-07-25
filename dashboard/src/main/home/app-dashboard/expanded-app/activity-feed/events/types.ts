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
export const PorterAppEvent = {
    toPorterAppEvent: (data: any): PorterAppEvent => {
        return {
            created_at: data.created_at ?? "",
            updated_at: data.updated_at ?? "",
            id: data.id ?? "",
            status: data.status ?? "",
            type: data.type ?? "",
            type_source: data.type_source ?? "",
            porter_app_id: data.porter_app_id ?? "",
            metadata: data.metadata ?? {},
        };
    }
}