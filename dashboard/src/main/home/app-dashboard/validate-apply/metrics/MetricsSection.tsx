import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";

import TabSelector from "components/TabSelector";
import SelectRow from "components/form-components/SelectRow";
import { getServiceNameFromControllerName, MetricNormalizer, resolutions, secondsBeforeNow } from "../../expanded-app/metrics/utils";
import { Metric, MetricType, NginxStatusMetric } from "../../expanded-app/metrics/types";
import { match } from "ts-pattern";
import { AvailableMetrics, NormalizedMetricsData } from "main/home/cluster-dashboard/expanded-chart/metrics/types";
import MetricsChart from "../../expanded-app/metrics/MetricsChart";
import { useQuery } from "@tanstack/react-query";
import Loading from "components/Loading";
import CheckboxRow from "components/CheckboxRow";

type PropsType = {
    projectId: number;
    clusterId: number;
    appName: string;
    services: Service[];
    deploymentTargetId: string;
};

export type Autoscaling = {
    minReplicas: number;
    maxReplicas: number;
    targetCPUUtilizationPercentage: number;
    targetMemoryUtilizationPercentage: number;
}

export interface Service {
    name: string;
    kind: string;
    ingress_enabled: boolean;
    absolute_name?: string;
    autoscaling?: Autoscaling;
}

type ServiceOption = {
    label: string;
    value: Service;
}

const MetricsSection: React.FunctionComponent<PropsType> = ({
    projectId,
    clusterId,
    appName,
    services,
    deploymentTargetId,
}) => {
  const [selectedService, setSelectedService] = useState<Service>();
  const [selectedRange, setSelectedRange] = useState("1H");
  const [showAutoscalingThresholds, setShowAutoscalingThresholds] = useState(false);

  const serviceOptions: ServiceOption[] = services.map((service) => {
    return {
      label: service.name,
      value: service,
    };
  });

    useEffect(() => {
        if (services.length > 0) {
            setSelectedService(services[0])
        }
    }, []);

  const { data: metricsData, isLoading: isMetricsDataLoading, refetch } = useQuery(
    [
        "getMetrics",
        projectId,
        clusterId,
        selectedService?.name,
        selectedRange,
        deploymentTargetId,
    ],
    async () => {
      if (selectedService?.name == null) {
        return;
      }
      const metrics: Metric[] = [];
      const metricTypes: MetricType[] = ["cpu", "memory"];

      const serviceName: string = selectedService.name
      const isHpaEnabled: boolean = selectedService.autoscaling != null;

      if (selectedService.kind === "web") {
         metricTypes.push("network");
      }

      if (isHpaEnabled) {
        metricTypes.push("hpa_replicas");
      }

      if (selectedService.ingress_enabled) {
        metricTypes.push("nginx:status")
      }

      const d = new Date();
      const end = Math.round(d.getTime() / 1000);
      const start = end - secondsBeforeNow[selectedRange];

      for (const metricType of metricTypes) {
          var kind = "";
        if (selectedService.kind === "web") {
            kind = "deployment";
        } else if (selectedService.kind === "worker") {
            kind = "deployment";
        } else if (selectedService.kind === "job") {
            kind = "job";
        }
        if (metricType === "nginx:status") {
            kind = "Ingress"
        }

        const aggregatedMetricsResponse = await api.appMetrics(
          "<token>",
          {
            metric: metricType,
            shouldsum: false,
            kind: kind,
            name: selectedService.absolute_name == null ? appName + "-" + selectedService.name : selectedService.absolute_name,
            deployment_target_id: deploymentTargetId,
            startrange: start,
            endrange: end,
            resolution: resolutions[selectedRange],
            pods: [],
          },
          {
            id: projectId,
            cluster_id: clusterId,
          }
        );

        const metricsNormalizer = new MetricNormalizer(
          [{ results: (aggregatedMetricsResponse.data ?? []).flatMap((d: any) => d.results) }],
          metricType,
        );
        if (metricType === "nginx:status") {
          const nginxMetric: NginxStatusMetric = {
            type: metricType,
            label: "Throughput",
            areaData: metricsNormalizer.getNginxStatusData(),
          }
          metrics.push(nginxMetric)
        } else {
          const [data, allPodsAggregatedData] = metricsNormalizer.getAggregatedData();
          const hpaData: NormalizedMetricsData[] = [];

          if (isHpaEnabled && ["cpu", "memory"].includes(metricType)) {
            let hpaMetricType = "cpu_hpa_threshold"
            if (metricType === "memory") {
              hpaMetricType = "memory_hpa_threshold"
            }

            const hpaRes = await api.appMetrics(
              "<token>",
              {
                metric: hpaMetricType,
                shouldsum: false,
                kind: kind,
                name: selectedService.absolute_name == null ? appName + "-" + selectedService.name : selectedService.absolute_name,
                deployment_target_id: deploymentTargetId,
                startrange: start,
                endrange: end,
                resolution: resolutions[selectedRange],
                pods: [],
              },
              {
                id: projectId,
                cluster_id: clusterId,
              }
            );

            const autoscalingMetrics = new MetricNormalizer(hpaRes.data, hpaMetricType as AvailableMetrics);
            hpaData.push(...autoscalingMetrics.getParsedData());
          }

          const metric: Metric = match(metricType)
            .with("cpu", () => ({
              type: metricType,
              label: "CPU Utilization (vCPUs)",
              data: data,
              aggregatedData: allPodsAggregatedData,
              hpaData,
            }))
            .with("memory", () => ({
              type: metricType,
              label: "RAM Utilization (Mi)",
              data: data,
              aggregatedData: allPodsAggregatedData,
              hpaData,
            }))
            .with("network", () => ({
              type: metricType,
              label: "Network Received Bytes (Ki)",
              data: data,
              aggregatedData: allPodsAggregatedData,
              hpaData,
            }))
            .with("hpa_replicas", () => ({
              type: metricType,
              label: "Number of replicas",
              data: data,
              aggregatedData: allPodsAggregatedData,
              hpaData,
            }))
            .with("nginx:errors", () => ({
              type: metricType,
              label: "5XX Error Percentage",
              data: data,
              aggregatedData: allPodsAggregatedData,
              hpaData,
            }))
            .exhaustive();
          metrics.push(metric);
        }
      };
      return metrics;
    },
    {
      enabled: selectedService != null,
      refetchOnWindowFocus: false,
      refetchInterval: 10000, // refresh metrics every 10 seconds
    }
  );

  const renderMetrics = () => {
    if (metricsData == null || isMetricsDataLoading) {
      return <Loading />;
    }
    return metricsData.map((metric: Metric, i: number) => {
      return (
        <MetricsChart
          key={metric.type}
          metric={metric}
          selectedRange={selectedRange}
          isLoading={isMetricsDataLoading}
          showAutoscalingLine={showAutoscalingThresholds}
        />
      );
    })
  }

  const renderShowAutoscalingThresholdsCheckbox = () => {
  if (selectedService == null) {
    return null;
  }

    const serviceName: string = selectedService.name
    const isHpaEnabled: boolean = selectedService.autoscaling != null

    if (!isHpaEnabled) {
      return null;
    }
    return (
      <CheckboxRow
        toggle={() => setShowAutoscalingThresholds(!showAutoscalingThresholds)}
        checked={showAutoscalingThresholds}
        label="Show Autoscaling Thresholds"
      />
    )
  }

  return (
    <StyledMetricsSection>
      <MetricsHeader>
        <Flex>
          <SelectRow
            displayFlex={true}
            label="Service"
            value={selectedService}
            setActiveValue={(x: any) => setSelectedService(x)}
            options={serviceOptions}
            width="200px"
          />
          <Highlight color={"#7d7d81"} onClick={() => refetch()}>
            <i className="material-icons">autorenew</i>
          </Highlight>
          {renderShowAutoscalingThresholdsCheckbox()}
        </Flex>
        <RangeWrapper>
          <Relative>
          </Relative>
          <TabSelector
            noBuffer={true}
            options={[
              { value: "1H", label: "1H" },
              { value: "6H", label: "6H" },
              { value: "1D", label: "1D" },
              { value: "1M", label: "1M" },
            ]}
            currentTab={selectedRange}
            setCurrentTab={(x: string) => setSelectedRange(x)}
          />
        </RangeWrapper>
      </MetricsHeader>
      {renderMetrics()}
    </StyledMetricsSection>
  );
};

export default MetricsSection;

const Relative = styled.div`
  position: relative;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const MetricsHeader = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  overflow: visible;
  justify-content: space-between;
`;

const RangeWrapper = styled.div`
  float: right;
  font-weight: bold;
  width: 158px;
  margin-top: -8px;
`;

const StyledMetricsSection = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const Highlight = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  margin-bottom: 15px;
  margin-top: 20px;
  color: ${(props: { color: string }) => props.color};
  cursor: pointer;

  > i {
    font-size: 20px;
    margin-right: 3px;
  }
`;