import * as stats from "simple-statistics";

export type MetricsCPUDataResponse = {
  pod?: string;
  results: {
    date: number;
    cpu: string;
  }[];
};

export type MetricsMemoryDataResponse = {
  pod?: string;
  results: {
    date: number;
    memory: string;
  }[];
};

export type MetricsNetworkDataResponse = {
  pod?: string;
  results: {
    date: number;
    bytes: string;
  }[];
};

export type MetricsNGINXErrorsDataResponse = {
  pod?: string;
  results: {
    date: number;
    error_pct: string;
  }[];
};

export type MetricsNGINXLatencyDataResponse = {
  pod?: string;
  results: {
    date: number;
    latency: string;
  }[];
};

export type MetricsHpaReplicasDataResponse = {
  pod?: string;
  results: {
    date: number;
    replicas: string;
  }[];
};

export type GenericMetricResponse = {
  pod?: string;
  results: {
    date: number;
    cpu: string;
    memory: string;
    bytes: string;
    error_pct: string;
    replicas: string;
    latency: string;
  }[];
};

export type NormalizedMetricsData = {
  date: number; // unix timestamp
  value: number; // value
};

export type DataGrouping = "aggregate" | "individual";

export type AggregationMethod = "min" | "avg" | "max";

export type AggregationDetails = {
  label: string;
  aggregationFunc: (data: number[]) => number;
};

export type AvailableMetrics =
  | "cpu"
  | "memory"
  | "network"
  | "nginx:errors"
  | "nginx:latency"
  | "nginx:latency-histogram"
  | "cpu_hpa_threshold"
  | "memory_hpa_threshold"
  | "hpa_replicas";

export type MetricOptions = {
  label: string;
  enable_percentiles: boolean;
};

export const MetricOptions = {
  default: (label: string, enable_percentiles?: boolean): MetricOptions => ({
    label: label,
    enable_percentiles: enable_percentiles ?? false,
  }),
};

export type Service = {
  name: string;
  kind: string;
  namespace: string;
};

export type AvailableTimeRanges = "1H" | "6H" | "1D" | "1M";

export const resolutions: { [range: string]: string } = {
  "1H": "1s",
  "6H": "15s",
  "1D": "15s",
  "1M": "5h",
};

export const secondsBeforeNow: { [range: string]: number } = {
  "1H": 60 * 60,
  "6H": 60 * 60 * 6,
  "1D": 60 * 60 * 24,
  "1M": 60 * 60 * 24 * 30,
};
