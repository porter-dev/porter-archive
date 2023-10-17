import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import api from "shared/api";

import TabSelector from "components/TabSelector";
import { MetricNormalizer, resolutions, secondsBeforeNow } from "../../expanded-app/metrics/utils";
import { Metric, MetricType, NginxStatusMetric } from "../../expanded-app/metrics/types";
import { match } from "ts-pattern";
import { AvailableMetrics, NormalizedMetricsData } from "main/home/cluster-dashboard/expanded-chart/metrics/types";
import MetricsChart from "../../expanded-app/metrics/MetricsChart";
import { useQuery } from "@tanstack/react-query";
import Loading from "components/Loading";
import CheckboxRow from "components/CheckboxRow";
import { PorterApp } from "@porter-dev/api-contracts";
import { useLocation } from "react-router";
import Filter from "components/porter/Filter";
import { GenericFilterOption, GenericFilter, FilterName } from "../../expanded-app/logs/types";

type PropsType = {
  projectId: number;
  clusterId: number;
  appName: string;
  services: PorterApp["services"];
  deploymentTargetId: string;
};

const MetricsSection: React.FunctionComponent<PropsType> = ({
  projectId,
  clusterId,
  appName,
  services,
  deploymentTargetId,
}) => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const serviceFromQueryParams = queryParams.get("service");
  const [selectedRange, setSelectedRange] = useState("1H");
  const [showAutoscalingThresholds, setShowAutoscalingThresholds] = useState(true);

  // filter out jobs until we can display metrics on them
  const serviceOptions: GenericFilterOption[] = useMemo(() => {
    const nonJobServiceNames = Object.keys(services).filter((name) => services[name].config.case !== "jobConfig");
    return nonJobServiceNames.map((name) => GenericFilterOption.of(name, name));
  }, [services]);

  const filters: GenericFilter[] = useMemo(() => {
    return [
      {
        name: "service_name",
        displayName: "Service",
        default: undefined,
        options: serviceOptions,
        setValue: (value: string) => {
          setSelectedFilterValues((prev) => ({ ...prev, service_name: value }));
        },
      } as GenericFilter,
    ];
  },[serviceOptions]);

  const [selectedFilterValues, setSelectedFilterValues] = useState<Partial<Record<FilterName, string>>>({
    service_name: serviceFromQueryParams && Object.keys(services).includes(serviceFromQueryParams) ? serviceFromQueryParams : "",
  }); 

  useEffect(() => {
    if (serviceOptions.length > 0 && selectedFilterValues.service_name === "") {
      setSelectedFilterValues((prev) => ({ ...prev, service_name: serviceOptions[0].value }));
    }
  }, [serviceOptions, selectedFilterValues.service_name]);

  const [serviceName, serviceKind, metricTypes, isHpaEnabled] = useMemo(() => {
    if (!selectedFilterValues.service_name) {
      return ["", "", [], false]
    }

    const service = services[selectedFilterValues.service_name]
    if (!service) {
      return ["", "", [], false]
    }

    const serviceName = service.absoluteName === "" ? (appName + "-" + selectedFilterValues.service_name) : service.absoluteName

    let serviceKind = ""
    const metricTypes: MetricType[] = ["cpu", "memory"];
    let isHpaEnabled = false

    if (service.config.case === "webConfig") {
      serviceKind = "web"
      metricTypes.push("network");
      if (service.config.value.autoscaling != null && service.config.value.autoscaling.enabled) {
        isHpaEnabled = true
      }
      if (!service.config.value.private) {
        metricTypes.push("nginx:status")
      }
    }

    if (service.config.case === "workerConfig") {
      serviceKind = "worker"
      if (service.config.value.autoscaling != null && service.config.value.autoscaling.enabled) {
        isHpaEnabled = true
      }
    }

    if (isHpaEnabled) {
      metricTypes.push("hpa_replicas");
    }

    return [serviceName, serviceKind, metricTypes, isHpaEnabled]
  }, [selectedFilterValues.service_name])


  const { data: metricsData, isLoading: isMetricsDataLoading, refetch } = useQuery(
    [
      "getMetrics",
      projectId,
      clusterId,
      serviceName,
      selectedRange,
      deploymentTargetId,
    ],
    async () => {
      if (serviceName === "" || serviceKind === "" || metricTypes.length === 0) {
        return;
      }

      const metrics: Metric[] = [];

      const d = new Date();
      const end = Math.round(d.getTime() / 1000);
      const start = end - secondsBeforeNow[selectedRange];

      for (const metricType of metricTypes) {
        var kind = "";
        if (serviceKind === "web") {
          kind = "deployment";
        } else if (serviceKind === "worker") {
          kind = "deployment";
        } else if (serviceKind === "job") {
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
            name: serviceName,
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
                name: serviceName,
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
      enabled: !!selectedFilterValues.service_name,
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

  const renderShowAutoscalingThresholdsCheckbox = (serviceName: string, isHpaEnabled: boolean) => {
    if (serviceName === "") {
      return null;
    }

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
          <Filter
            filters={filters}
            selectedFilterValues={selectedFilterValues}
          />
          <Highlight color={"#7d7d81"} onClick={() => refetch()}>
            <i className="material-icons">autorenew</i>
          </Highlight>
          {renderShowAutoscalingThresholdsCheckbox(serviceName, isHpaEnabled)}
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
  margin-bottom: 20px;
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