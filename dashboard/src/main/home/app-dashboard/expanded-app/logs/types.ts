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
    metadata?: z.infer<typeof AgentLogMetadataSchema>;
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

export interface GenericFilterOption {
    label: string;
    value: string;
}
export const GenericFilterOption = {
    of: (label: string, value: string): GenericFilterOption => {
        return { label, value };
    }
}
export type LogFilterName = 'revision' | 'output_stream' | 'pod_name';
export interface GenericLogFilter {
    name: LogFilterName;
    displayName: string;
    default: GenericFilterOption;
    options: GenericFilterOption[];
    setValue: (value: string) => void;
}
export const GenericLogFilter = {
    isDefault: (filter: GenericLogFilter, value: string) => {
        return filter.default.value === value;
    },

    getDefaultOption: (filterName: LogFilterName) => {
        switch (filterName) {
            case 'revision':
                return GenericFilterOption.of('All', 'all');
            case 'output_stream':
                return GenericFilterOption.of('stdout', 'stdout');
            case 'pod_name':
                return GenericFilterOption.of('All', 'all');
            default:
                return GenericFilterOption.of('All', 'all');
        }
    },
}
