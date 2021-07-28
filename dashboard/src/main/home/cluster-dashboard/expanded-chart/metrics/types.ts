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

export type GenericMetricResponse = {
  pod?: string;
  results: {
    date: number;
    cpu: string;
    memory: string;
    bytes: string;
    error_pct: string;
  }[];
};

export type NormalizedMetricsData = {
  date: number; // unix timestamp
  value: number; // value
};

export type AvailableMetrics = "cpu" | "memory" | "network" | "nginx:errors";
