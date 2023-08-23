import { NormalizedMetricsData, NormalizedNginxStatusMetricsData } from "main/home/cluster-dashboard/expanded-chart/metrics/types";

export type MetricType = 'cpu' | 'memory' | 'network' | 'nginx:status' | 'nginx:errors' | 'hpa_replicas';
export interface Metric {
    type: MetricType;
    label: string;
}
export interface AggregatedMetric extends Metric {
    data: NormalizedMetricsData[];
    aggregatedData: Record<string, NormalizedMetricsData[]>;
    hpaData: NormalizedMetricsData[];
}
export interface NginxStatusMetric extends Metric {
    areaData: NormalizedNginxStatusMetricsData[];
}

export const isNginxMetric = (metric: Metric): metric is NginxStatusMetric => {
    return metric.type === 'nginx:status';
}

