import { NormalizedMetricsData } from "main/home/cluster-dashboard/expanded-chart/metrics/types";

export type Metric = CPUMetric | NginxStatusMetric | NginxErrorsMetric;

export type MetricType = 'cpu' | 'memory' | 'network' | 'nginx:status' | 'nginx:errors' | 'hpa_replicas';
interface MetricBase {
    type: MetricType;
    label: string;
}
interface CPUMetric extends MetricBase {
    type: 'cpu';
    label: 'CPU Utilization (vCPUs)';
}
interface NginxStatusMetric extends MetricBase {
    type: 'nginx:status';
    label: "Nginx Status Codes";
    areaData: Record<string, NormalizedMetricsData[]>;
}
interface NginxErrorsMetric extends MetricBase {
    type: 'nginx:errors';
    label: '5XX Error Percentage';
}


