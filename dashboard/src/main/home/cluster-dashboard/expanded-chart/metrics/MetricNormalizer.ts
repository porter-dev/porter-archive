import {
  GenericMetricResponse,
  NormalizedMetricsData,
  MetricsMemoryDataResponse,
  MetricsCPUDataResponse,
  MetricsNetworkDataResponse,
  MetricsNGINXErrorsDataResponse,
  AvailableMetrics,
} from "./types";

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
    return [];
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
        value: parseFloat(d.error_pct), // put units in Ki
      };
    });
  }
}
