export type MetricsCPUDataResponse = {
  pod?: string;
  results: Array<{
    date: number;
    cpu: string;
  }>;
};

export type MetricsMemoryDataResponse = {
  pod?: string;
  results: Array<{
    date: number;
    memory: string;
  }>;
};

export type MetricsNetworkDataResponse = {
  pod?: string;
  results: Array<{
    date: number;
    bytes: string;
  }>;
};

export type MetricsNGINXErrorsDataResponse = {
  pod?: string;
  results: Array<{
    date: number;
    error_pct: string;
  }>;
};

export type MetricsNGINXLatencyDataResponse = {
  pod?: string;
  results: Array<{
    date: number;
    latency: string;
  }>;
};

export type MetricsNGINXStatusDataResponse = {
  pod?: string;
  results: Array<{
    "1xx": string;
    "2xx": string;
    "3xx": string;
    "4xx": string;
    "5xx": string;
    date: number;
  }>;
};

export type MetricsReplicasDataResponse = {
  pod?: string;
  results: Array<{
    date: number;
    replicas: string;
  }>;
};

export type GenericMetricResponseResults = {
  "1xx": string;
  "2xx": string;
  "3xx": string;
  "4xx": string;
  "5xx": string;
  date: number;
  cpu: string;
  memory: string;
  bytes: string;
  error_pct: string;
  replicas: string;
  latency: string;
};

export type GenericMetricResponse = {
  pod?: string;
  results: GenericMetricResponseResults[];
};

export type NormalizedMetricsData = {
  date: number; // unix timestamp
  value: number; // value
};

export type NormalizedNginxStatusMetricsData = {
  date: number; // unix timestamp
  "1xx": number;
  "2xx": number;
  "3xx": number;
  "4xx": number;
  "5xx": number;
};

export type AvailableMetrics =
  | "cpu"
  | "memory"
  | "network"
  | "nginx:errors"
  | "nginx:latency"
  | "nginx:status"
  | "cpu_hpa_threshold"
  | "memory_hpa_threshold"
  | "hpa_replicas";
