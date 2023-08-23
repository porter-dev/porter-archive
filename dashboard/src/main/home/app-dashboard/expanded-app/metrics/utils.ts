import * as stats from "simple-statistics";
import _ from "lodash";

import {
    GenericMetricResponse,
    MetricsCPUDataResponse,
    MetricsMemoryDataResponse,
    MetricsNetworkDataResponse,
    MetricsNGINXErrorsDataResponse,
    MetricsNGINXStatusDataResponse,
    AvailableMetrics,
    MetricsHpaReplicasDataResponse,
    MetricsNGINXLatencyDataResponse,
    NormalizedMetricsData,
    NormalizedNginxStatusMetricsData,
} from "main/home/cluster-dashboard/expanded-chart/metrics/types";

// these match log colors
export const StatusCodeDataColors: Record<string, string> = {
    "1xx": "#4B4F7C", // gray
    "2xx": "#FFFFFF", // white
    "3xx": "#54B835", // green
    "4xx": "#BBBB3C", // yellow
    "5xx": "#9C20A5", // purple
};

type RGB = {
    r: number;
    g: number;
    b: number;
};

function componentToHex(c: number) {
    c = Math.round(c);
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

function rgbToHex(rgb: RGB) {
    return (
        "#" + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b)
    );
}

export function pickColor(
    color1: string,
    color2: string,
    index: number,
    total: number
) {
    if (total == 1) {
        return color1;
    }

    const w1 = index / (total - 1);
    const w2 = 1 - w1;

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (rgb1 == null || rgb2 == null) {
        return "#000000";
    }

    const rgb: RGB = {
        r: Math.round(rgb1.r * w1 + rgb2.r * w2),
        g: Math.round(rgb1.g * w1 + rgb2.g * w2),
        b: Math.round(rgb1.b * w1 + rgb2.b * w2),
    };

    return rgbToHex(rgb);
}

export const getServiceNameFromControllerName = (controllerName: string, porterAppName: string): string => {
    const prefix = `${porterAppName}-`;

    if (!controllerName.startsWith(prefix)) {
        return "";
    }

    controllerName = controllerName.substring(prefix.length);

    const suffixes = ["-web", "-wkr", "-job"];
    let index = -1;

    for (const suffix of suffixes) {
        const newIndex = controllerName.lastIndexOf(suffix);
        index = Math.max(index, newIndex);
    }

    return index !== -1 ? controllerName.substring(0, index) : controllerName;
}

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

        return []
    }

    getAggregatedData(): [NormalizedMetricsData[], Record<string, NormalizedMetricsData[]>] {
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

        return [avg, {
            min,
            max,
        }];
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

    private parseHpaReplicaMetrics(
        arr: MetricsHpaReplicasDataResponse["results"]
    ) {
        return arr.map((d) => {
            return {
                date: d.date,
                value: parseInt(d.replicas),
            };
        });
    }
}


