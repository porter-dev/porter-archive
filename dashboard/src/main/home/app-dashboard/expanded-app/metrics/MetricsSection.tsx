import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";

import TabSelector from "components/TabSelector";
import SelectRow from "components/form-components/SelectRow";
import { getServiceNameFromControllerName, MetricNormalizer, resolutions, secondsBeforeNow } from "./utils";
import { Metric, MetricType, NginxStatusMetric } from "./types";
import { match } from "ts-pattern";
import { AvailableMetrics, NormalizedMetricsData } from "main/home/cluster-dashboard/expanded-chart/metrics/types";
import MetricsChart from "./MetricsChart2";
import { useQuery } from "@tanstack/react-query";
import Loading from "components/Loading";

type PropsType = {
  currentChart: ChartType;
  appName: string;
  serviceName?: string;
};

const MetricsSection: React.FunctionComponent<PropsType> = ({
  currentChart,
  appName,
  serviceName,
}) => {
  const [selectedController, setSelectedController] = useState<any>(null);
  const [selectedRange, setSelectedRange] = useState("1H");

  const { currentCluster, currentProject } = useContext(
    Context
  );

  const { data: controllerOptions, isLoading: isControllerListLoading } = useQuery(
    [
      "getChartControllers",
      currentProject?.id,
      currentChart.name,
      currentChart.namespace,
      currentCluster?.id,
      currentChart.version,
    ],
    async () => {
      if (currentProject?.id == null || currentCluster?.id == null) {
        return;
      }
      const res = await api.getChartControllers(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: currentChart.name,
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          revision: currentChart.version,
        }
      );

      const controllerOptions = res.data.map((controller: any) => {
        return { value: controller, label: getServiceNameFromControllerName(controller?.metadata?.name, appName) };
      });

      return controllerOptions;
    }
  );

  const { data: metricsData, isLoading: isMetricsDataLoading, refetch } = useQuery(
    [
      "getMetrics",
      currentProject?.id,
      currentCluster?.id,
      selectedController?.metadata?.name,
      selectedRange,
    ],
    async () => {
      if (currentProject?.id == null || currentCluster?.id == null) {
        return;
      }
      const metrics = [] as Metric[];
      const metricTypes: MetricType[] = ["cpu", "memory", "network"];

      const serviceName: string = selectedController?.metadata.labels["app.kubernetes.io/name"]
      const isHpaEnabled: boolean = currentChart?.config?.[serviceName]?.autoscaling?.enabled

      if (isHpaEnabled) {
        metricTypes.push("hpa_replicas");
      }

      if (currentChart?.chart?.metadata?.name == "ingress-nginx") {
        metricTypes.push("nginx:errors");
      }

      if (currentChart?.config?.[serviceName]?.ingress?.enabled) {
        metricTypes.push("nginx:status")
      }

      const d = new Date();
      const end = Math.round(d.getTime() / 1000);
      const start = end - secondsBeforeNow[selectedRange];

      for (const metricType of metricTypes) {
        const kind = metricType === "nginx:status" ? "Ingress" : selectedController?.kind

        const aggregatedMetricsResponse = await api.getMetrics(
          "<token>",
          {
            metric: metricType,
            shouldsum: false,
            kind: kind,
            name: selectedController?.metadata.name,
            namespace: currentChart.namespace,
            startrange: start,
            endrange: end,
            resolution: resolutions[selectedRange],
            pods: [],
          },
          {
            id: currentProject.id,
            cluster_id: currentCluster.id,
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

          if (isHpaEnabled) {
            let hpaMetricType = "cpu_hpa_threshold"
            if (metricType === "memory") {
              hpaMetricType = "memory_hpa_threshold"
            }

            const hpaRes = await api.getMetrics(
              "<token>",
              {
                metric: hpaMetricType,
                shouldsum: true,
                kind: kind,
                name: selectedController?.metadata.name,
                namespace: currentChart.namespace,
                startrange: start,
                endrange: end,
                resolution: resolutions[selectedRange],
                pods: [],
              },
              {
                id: currentProject.id,
                cluster_id: currentCluster.id,
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
      enabled: selectedController != null,
    }
  );

  useEffect(() => {
    if (controllerOptions == null) {
      return;
    }
    const controllerOption = controllerOptions.find(
      (option: any) => option.label === serviceName
    );
    if (controllerOption) {
      setSelectedController(controllerOption.value);
    } else {
      setSelectedController(controllerOptions[0]?.value);
    }
  }, [controllerOptions]);

  const renderMetrics = () => {
    if (metricsData == null) {
      return <Loading />;
    }
    return metricsData.map((metric: Metric, i: number) => {
      return (
        <MetricsChart
          key={i}
          metric={metric}
          selectedRange={selectedRange}
          isLoading={isMetricsDataLoading}
        />
      );
    })
  }

  return (
    <StyledMetricsSection>
      <MetricsHeader>
        <Flex>
          <SelectRow
            displayFlex={true}
            label="Service"
            value={selectedController}
            setActiveValue={(x: any) => setSelectedController(x)}
            options={controllerOptions}
            width="200px"
            isLoading={isControllerListLoading}
          />
          <Highlight color={"#7d7d81"} onClick={() => refetch()}>
            <i className="material-icons">autorenew</i>
          </Highlight>
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
