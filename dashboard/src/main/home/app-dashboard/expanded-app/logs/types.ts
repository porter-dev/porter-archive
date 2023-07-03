import { z } from "zod";
import { AnserJsonEntry } from "anser";

export enum Direction {
    forward = "forward",
    backward = "backward",
}

export interface PorterLog {
    line: AnserJsonEntry[];
    lineNumber: number;
    timestamp?: string;
}

export interface PaginationInfo {
    previousCursor: string | null;
    nextCursor: string | null;
}

const AgentLogMetadataSchema = z.object({
    pod_name: z.string(),
    pod_namespace: z.string(),
    revision: z.string(),
    output_stream: z.string(),
    app_name: z.string(),
});

export const AgentLogSchema = z.object({
    line: z.string(),
    timestamp: z.string(),
    metadata: AgentLogMetadataSchema.optional(),
});
export type AgentLog = z.infer<typeof AgentLogSchema>;