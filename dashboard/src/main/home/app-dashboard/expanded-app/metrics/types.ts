import {
  type NormalizedMetricsData,
  type NormalizedNginxStatusMetricsData,
} from "main/home/cluster-dashboard/expanded-chart/metrics/types";

export type MetricType =
  | "cpu"
  | "memory"
  | "network"
  | "nginx:status"
  | "nginx:errors"
  | "hpa_replicas";
export type Metric = {
  type: MetricType;
  label: string;
};
export type AggregatedMetric = {
  data: NormalizedMetricsData[];
  aggregatedData: Record<string, NormalizedMetricsData[]>;
  hpaData: NormalizedMetricsData[];
} & Metric;
export type NginxStatusMetric = {
  areaData: NormalizedNginxStatusMetricsData[];
} & Metric;

export const isNginxMetric = (metric: Metric): metric is NginxStatusMetric => {
  return metric.type === "nginx:status";
};
