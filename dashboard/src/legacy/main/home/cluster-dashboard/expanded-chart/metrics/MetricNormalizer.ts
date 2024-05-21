import _ from "lodash";
import * as stats from "simple-statistics";

import {
  type AvailableMetrics,
  type GenericMetricResponse,
  type MetricsCPUDataResponse,
  type MetricsMemoryDataResponse,
  type MetricsNetworkDataResponse,
  type MetricsNGINXErrorsDataResponse,
  type MetricsNGINXLatencyDataResponse,
  type MetricsNGINXStatusDataResponse,
  type MetricsReplicasDataResponse,
  type NormalizedMetricsData,
  type NormalizedNginxStatusMetricsData,
} from "./types";

/**
 * Normalize values from the API to be readable by the AreaChart component.
 * This class was created to reduce the amount of parsing inside the MetricsSection component
 * and improve readability
 */
export class MetricNormalizer {
  metric_results: GenericMetricResponse["results"];
  kind: AvailableMetrics;

  constructor(data: GenericMetricResponse[], kind: AvailableMetrics) {
    if (!Array.isArray(data) || !data[0]?.results) {
      throw new Error("Failed parsing response" + JSON.stringify(data));
    }
    this.metric_results = data[0].results;
    this.kind = kind;
  }

  getParsedData(): NormalizedMetricsData[] {
    if (this.kind.includes("cpu")) {
      return this.parseCPUMetrics(this.metric_results);
    }
    if (this.kind.includes("memory")) {
      return this.parseMemoryMetrics(this.metric_results);
    }
    if (this.kind.includes("network")) {
      return this.parseNetworkMetrics(this.metric_results);
    }
    if (this.kind.includes("nginx:errors")) {
      return this.parseNGINXErrorsMetrics(this.metric_results);
    }
    if (
      this.kind.includes("nginx:latency") ||
      this.kind.includes("nginx:latency-histogram")
    ) {
      return this.parseNGINXLatencyMetrics(this.metric_results);
    }
    if (this.kind.includes("hpa_replicas")) {
      return this.parseHpaReplicaMetrics(this.metric_results);
    }
    return [];
  }

  getNginxStatusData(): NormalizedNginxStatusMetricsData[] {
    if (this.kind.includes("nginx:status")) {
      return this.parseNGINXStatusMetrics(this.metric_results);
    }

    return [];
  }

  getAggregatedData(): Record<string, NormalizedMetricsData[]> {
    const groupedByDate = _.groupBy(this.getParsedData(), "date");

    const avg = Object.keys(groupedByDate).map((date) => {
      const values = groupedByDate[date].map((d) => d.value);
      return {
        date: Number(date),
        value: stats.mean(values),
      };
    });

    const min = Object.keys(groupedByDate).map((date) => {
      const values = groupedByDate[date].map((d) => d.value);
      return {
        date: Number(date),
        value: stats.min(values),
      };
    });

    const max = Object.keys(groupedByDate).map((date) => {
      const values = groupedByDate[date].map((d) => d.value);
      return {
        date: Number(date),
        value: stats.max(values),
      };
    });

    return {
      min,
      avg,
      max,
    };
  }

  private parseCPUMetrics(arr: MetricsCPUDataResponse["results"]) {
    return arr.map((d) => {
      return {
        date: d.date,
        value: parseFloat(d.cpu),
      };
    });
  }

  private parseMemoryMetrics(arr: MetricsMemoryDataResponse["results"]) {
    return arr.map((d) => {
      return {
        date: d.date,
        value: parseFloat(d.memory) / (1024 * 1024), // put units in Mi
      };
    });
  }

  private parseNetworkMetrics(arr: MetricsNetworkDataResponse["results"]) {
    return arr.map((d) => {
      return {
        date: d.date,
        value: parseFloat(d.bytes) / 1024, // put units in Ki
      };
    });
  }

  private parseNGINXErrorsMetrics(
    arr: MetricsNGINXErrorsDataResponse["results"]
  ) {
    return arr.map((d) => {
      return {
        date: d.date,
        value: parseFloat(d.error_pct),
      };
    });
  }

  private parseNGINXStatusMetrics(
    arr: MetricsNGINXStatusDataResponse["results"]
  ) {
    return arr.map((d) => {
      return {
        date: d.date,
        "1xx": parseInt(d["1xx"]),
        "2xx": parseInt(d["2xx"]),
        "3xx": parseInt(d["3xx"]),
        "4xx": parseInt(d["4xx"]),
        "5xx": parseInt(d["5xx"]),
      };
    });
  }

  private parseNGINXLatencyMetrics(
    arr: MetricsNGINXLatencyDataResponse["results"]
  ) {
    return arr.map((d) => {
      return {
        date: d.date,
        value: d.latency != "NaN" ? parseFloat(d.latency) : 0,
      };
    });
  }

  private parseHpaReplicaMetrics(arr: MetricsReplicasDataResponse["results"]) {
    return arr.map((d) => {
      return {
        date: d.date,
        value: parseInt(d.replicas),
      };
    });
  }
}
