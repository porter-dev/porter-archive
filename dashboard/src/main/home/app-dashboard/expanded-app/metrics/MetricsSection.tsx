import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";

import TabSelector from "components/TabSelector";
import SelectRow from "components/form-components/SelectRow";
import MetricsChart from "./MetricsChart";
import { getServiceNameFromControllerName, MetricNormalizer } from "./utils";
import { Metric, MetricType, NginxStatusMetric } from "./types";
import { match } from "ts-pattern";
import { AvailableMetrics, NormalizedMetricsData } from "main/home/cluster-dashboard/expanded-chart/metrics/types";

type PropsType = {
  currentChart: ChartType;
  appName: string;
  serviceName?: string;
};

export const resolutions: { [range: string]: string } = {
  "1H": "1s",
  "6H": "15s",
  "1D": "15s",
  "1M": "5h",
};

export const secondsBeforeNow: { [range: string]: number } = {
  "1H": 60 * 60,
  "6H": 60 * 60 * 6,
  "1D": 60 * 60 * 24,
  "1M": 60 * 60 * 24 * 30,
};

const MetricsSection: React.FunctionComponent<PropsType> = ({
  currentChart,
  appName,
  serviceName,
}) => {
  const [controllerOptions, setControllerOptions] = useState([]);
  const [selectedController, setSelectedController] = useState<any>();
  const [ingressOptions, setIngressOptions] = useState([]);
  const [selectedIngress, setSelectedIngress] = useState(null);
  const [selectedRange, setSelectedRange] = useState("1H");
  const [isLoading, setIsLoading] = useState(0);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    if (currentChart?.chart?.metadata?.name === "ingress-nginx") {
      setIsLoading((prev) => prev + 1);

      api
        .getNGINXIngresses(
          "<token>",
          {},
          {
            id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        )
        .then((res) => {
          const ingressOptions = res.data.map((ingress: any) => ({
            value: ingress,
            label: ingress.name,
          }));
          setIngressOptions(ingressOptions);
          setSelectedIngress(ingressOptions[0]?.value);
          // iterate through the controllers to get the list of pods
        })
        .catch((err) => {
          setCurrentError(JSON.stringify(err));
        })
        .finally(() => {
          setIsLoading((prev) => prev - 1);
        });
    }

    setIsLoading((prev) => prev + 1);

    api
      .getChartControllers(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: currentChart.name,
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          revision: currentChart.version,
        }
      )
      .then((res) => {
        const controllerOptions = res.data.map((controller: any) => {
          return { value: controller, label: getServiceNameFromControllerName(controller?.metadata?.name, appName) };
        });

        setControllerOptions(controllerOptions);
        const controllerOption = controllerOptions.find(
          (option: any) => option.label === serviceName
        );
        if (controllerOption) {
          setSelectedController(controllerOption.value);
        } else {
          setSelectedController(controllerOptions[0]?.value);
        }
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        setControllerOptions([]);
      })
      .finally(() => {
        setIsLoading((prev) => prev - 1);
      });
  }, [currentChart, currentCluster, currentProject]);

  useEffect(() => {
    refreshMetrics();
  }, [selectedController]);

  const refreshMetrics = async () => {
    if (currentProject?.id == null || currentCluster?.id == null) {
      return;
    }
    const newMetrics = [] as Metric[];
    const metricTypes: MetricType[] = ["cpu", "memory", "network", "nginx:status"];

    const serviceName: string = selectedController?.metadata.labels["app.kubernetes.io/name"]
    const isHpaEnabled: boolean = currentChart?.config?.[serviceName]?.autoscaling?.enabled

    if (isHpaEnabled) {
      metricTypes.push("hpa_replicas");
    }

    if (currentChart?.chart?.metadata?.name == "ingress-nginx") {
      metricTypes.push("nginx:errors");
    }

    const d = new Date();
    const end = Math.round(d.getTime() / 1000);
    const start = end - secondsBeforeNow[selectedRange];

    for (const metricType of metricTypes) {
      const kind = metricType === "nginx:status" ? "Ingress" : selectedController?.kind
      try {
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
            label: "Nginx Status Codes",
            areaData: metricsNormalizer.getNginxStatusData(),
          }
          newMetrics.push(nginxMetric)
        } else {
          const [data, allPodsAggregatedData] = metricsNormalizer.getAggregatedData();
          const hpaData: NormalizedMetricsData[] = [];

          if (isHpaEnabled && ["cpu", "memory"].includes(metricType)) {
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
              label: "Nginx Errors",
              data: data,
              aggregatedData: allPodsAggregatedData,
              hpaData,
            }))
            .exhaustive();
          newMetrics.push(metric);
        }
      } catch (err) {
        console.log(err);
      }
    };

    setMetrics(newMetrics);
  }

  const renderHpaChart = () => {
    const serviceName: string = selectedController?.metadata.labels["app.kubernetes.io/name"]
    const isHpaEnabled: boolean = currentChart?.config?.[serviceName]?.autoscaling?.enabled
    return isHpaEnabled ? (
      <MetricsChart
        currentChart={currentChart}
        selectedController={selectedController}
        selectedIngress={selectedIngress}
        selectedMetric="hpa_replicas"
        selectedMetricLabel="Number of replicas"
        selectedPod="All"
        selectedRange={selectedRange}
        pods={[]}
      />
    ) : null
  };

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
            width="100%"
          />
          <Highlight color={"#7d7d81"} onClick={() => forceUpdate()}>
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
      <MetricsChart
        currentChart={currentChart}
        selectedController={selectedController}
        selectedIngress={selectedIngress}
        selectedMetric="cpu"
        selectedMetricLabel="CPU Utilization (vCPUs)"
        selectedPod="All"
        selectedRange={selectedRange}
        pods={[]}
      />
      <MetricsChart
        currentChart={currentChart}
        selectedController={selectedController}
        selectedIngress={selectedIngress}
        selectedMetric="memory"
        selectedMetricLabel="RAM Utilization (Mi)"
        selectedPod="All"
        selectedRange={selectedRange}
        pods={[]}
      />
      <MetricsChart
        currentChart={currentChart}
        selectedController={selectedController}
        selectedIngress={selectedIngress}
        selectedMetric="network"
        selectedMetricLabel="Network Received Bytes (Ki)"
        selectedPod="All"
        selectedRange={selectedRange}
        pods={[]}
      />
      <MetricsChart
        currentChart={currentChart}
        selectedController={selectedController}
        selectedIngress={selectedIngress}
        selectedMetric="nginx:status"
        selectedMetricLabel="Nginx Status Codes"
        selectedPod="All"
        selectedRange={selectedRange}
        pods={[]}
      />
      {renderHpaChart()}
      {currentChart?.chart?.metadata?.name == "ingress-nginx" && (
        <MetricsChart
          currentChart={currentChart}
          selectedController={selectedController}
          selectedIngress={selectedIngress}
          selectedMetric="nginx:errors"
          selectedMetricLabel="5XX Error Percentage"
          selectedPod="All"
          selectedRange={selectedRange}
          pods={[]}
        />
      )}
      {metrics.map((metric: Metric, i: number) => {
        return (
          <MetricsChart
            key={i}
            currentChart={currentChart}
            selectedController={selectedController}
            selectedIngress={selectedIngress}
            selectedMetric={metric.type}
            selectedMetricLabel={metric.label}
            selectedPod={"All"}
            selectedRange={selectedRange}
            pods={[]}
          />
        );
      })}
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
