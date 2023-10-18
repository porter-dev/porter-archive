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
    metadata?: z.infer<typeof agentLogMetadataValidator>;
}

export interface PaginationInfo {
    previousCursor: string | null;
    nextCursor: string | null;
}

const rawLabelsValidator = z.object({
    porter_run_absolute_name: z.string().optional(),
    porter_run_app_id: z.string().optional(),
    porter_run_app_name: z.string().optional(),
    porter_run_app_revision_id: z.string().optional(),
    porter_run_service_name: z.string().optional(),
    porter_run_service_type: z.string().optional(),
});
export type RawLabels = z.infer<typeof rawLabelsValidator>;

const agentLogMetadataValidator = z.object({
    pod_name: z.string(),
    pod_namespace: z.string(),
    revision: z.string(),
    output_stream: z.string(),
    app_name: z.string(),
    raw_labels: rawLabelsValidator.nullish(),
});

export const agentLogValidator = z.object({
    line: z.string(),
    timestamp: z.string(),
    metadata: agentLogMetadataValidator.optional(),
});
export type AgentLog = z.infer<typeof agentLogValidator>;

export interface GenericFilterOption {
    label: string;
    value: string;
}
export const GenericFilterOption = {
    of: (label: string, value: string): GenericFilterOption => {
        return { label, value };
    }
}
export type FilterName = 'revision' | 'output_stream' | 'pod_name' | 'service_name';
export interface GenericFilter {
    name: FilterName;
    displayName: string;
    default: GenericFilterOption | undefined;
    options: GenericFilterOption[];
    setValue: (value: string) => void;
}
export const GenericFilter = {
    isDefault: (filter: GenericFilter, value: string) => {
        return filter.default && filter.default.value === value;
    },

    getDefaultOption: (filterName: FilterName) => {
        switch (filterName) {
            case 'service_name':
                return GenericFilterOption.of('All', 'all');
            case 'revision':
                return GenericFilterOption.of('All', 'all');
            case 'output_stream':
                return GenericFilterOption.of('All', 'all');
            case 'pod_name':
                return GenericFilterOption.of('All', 'all');
            default:
                return GenericFilterOption.of('All', 'all');
        }
    },
}
export type LogFilterQueryParamOpts = {
    revision: string | null;
    output_stream: string | null;
    service: string | null;
}
