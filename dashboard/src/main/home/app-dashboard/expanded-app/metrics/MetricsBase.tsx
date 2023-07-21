import React, { useContext, useEffect, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import api from "shared/api";

import TabSelector from "components/TabSelector";
import Loading from "components/Loading";
import AreaChart from "./AreaChart";
import { MetricNormalizer } from "./MetricNormalizer";
import {
  AvailableMetrics,
  GenericMetricResponse,
  NormalizedMetricsData,
  Service,
  resolutions,
  secondsBeforeNow,
  AvailableTimeRanges,
  MetricOptions,
  DataGrouping,
  AggregationMethod,
  AggregationDetails,
} from "./types";
import {
  RowWrapper,
  Highlight,
  Message,
  Flex,
  MetricsHeader,
  DropdownOverlay,
  Option,
  Dropdown,
  RangeWrapper,
  MetricSelector,
  MetricsLabel,
  StyledMetricsSection,
} from "./styles";
import CheckboxRow from "components/form-components/CheckboxRow";
import DataLegend from "./DataLegend";
import Spacer from "../../../../../components/porter/Spacer";
import * as stats from "simple-statistics";

type PropsType = {
  services: Service[];
  timeRangeOptions: AvailableTimeRanges[];
  initialMetricsOptions: AvailableMetrics[];
  autoscaling_enabled: boolean;
  project_id: number;
  cluster_id: number;
};

const MetricsBase: React.FunctionComponent<PropsType> = ({
  services,
  timeRangeOptions = ["1H", "6H", "1D", "1M"],
  initialMetricsOptions = ["cpu", "memory", "network"],
  autoscaling_enabled = false,
  project_id,
  cluster_id,
}) => {
  const metricsLabelMap: Record<AvailableMetrics, MetricOptions> = {
    cpu: MetricOptions.default("CPU Utilization (vCPUs)"),
    memory: MetricOptions.default("RAM Utilization (Mi)"),
    network: MetricOptions.default("Network Received Bytes (Ki)"),
    hpa_replicas: MetricOptions.default("Number of replicas"),
    "nginx:errors": MetricOptions.default("5XX Error Percentage"),
    "nginx:latency": MetricOptions.default("Latency (ms)"),
    "nginx:latency-histogram": MetricOptions.default(
      "Percentile Response Times (s)",
      true
    ),
    cpu_hpa_threshold: MetricOptions.default(""),
    memory_hpa_threshold: MetricOptions.default(""),
  };

  const aggregationMap: Record<AggregationMethod, AggregationDetails> = {
    min: {
      label: "MIN",
      aggregationFunc: stats.min,
    },
    avg: {
      label: "AVG",
      aggregationFunc: stats.average,
    },
    max: {
      label: "MAX",
      aggregationFunc: stats.max,
    },
  };

  const [metricsOptions, setMetricsOptions] = useState<AvailableMetrics[]>(
    initialMetricsOptions
  );
  const [selectedService, setSelectedService] = useState<Service>();
  const [selectedRange, setSelectedRange] = useState<AvailableTimeRanges>();
  const [selectedMetric, setSelectedMetric] = useState<AvailableMetrics>();
  const [metricDropdownExpanded, setMetricDropdownExpanded] = useState(false);
  const [serviceDropdownExpanded, setServiceDropdownExpanded] = useState(false);
  const [individualData, setIndividualData] = useState<
    Record<string, NormalizedMetricsData[]>
  >({});
  const [aggregatedData, setAggregatedData] = useState<
    Record<string, NormalizedMetricsData[]>
  >({});
  const [isLoading, setIsLoading] = useState(0);
  const [hpaData, setHpaData] = useState<NormalizedMetricsData[]>([]);
  const [showHPA, setShowHPA] = useState(autoscaling_enabled);
  const [dataGrouping, setDataGrouping] = useState<DataGrouping>("aggregate");
  const [
    individualAggregationMethod,
    setIndividualAggregationMethod,
  ] = useState<AggregationMethod>("avg");

  // Add or remove hpa replicas chart option when current chart is updated
  useEffect(() => {
    if (autoscaling_enabled) {
      setMetricsOptions((prev) => {
        if (prev.find((option) => option === "hpa_replicas")) {
          return [...prev];
        }
        return [...prev, "hpa_replicas"];
      });
    } else {
      setMetricsOptions((prev) => {
        const hpaReplicasOptionIndex = prev.findIndex(
          (option) => option === "hpa_replicas"
        );
        const options = [...prev];
        if (hpaReplicasOptionIndex > -1) {
          options.splice(hpaReplicasOptionIndex, 1);
        }
        return [...options];
      });
    }

    if (metricsOptions.length > 0) {
      setSelectedMetric(metricsOptions[0]);
    }
    if (services.length > 0) {
      setSelectedService(services[0]);
    }
    if (timeRangeOptions.length > 0) {
      setSelectedRange(timeRangeOptions[0]);
    }
  }, [
    services,
    timeRangeOptions,
    initialMetricsOptions,
    autoscaling_enabled,
    project_id,
    cluster_id,
  ]);

  useEffect(() => {
    if (selectedMetric && selectedRange && selectedService) {
      getMetrics();
    }
  }, [selectedMetric, selectedRange, selectedService]);

  const getAutoscalingThreshold = async (
    metricType: "cpu_hpa_threshold" | "memory_hpa_threshold",
    shouldavg: boolean,
    namespace: string,
    start: number,
    end: number
  ) => {
    setHpaData([]);
    if (
      selectedService == null ||
      selectedRange == null ||
      selectedMetric == null
    ) {
      return;
    }
    setIsLoading((prev) => prev + 1);

    try {
      const res = await api.getMetrics(
        "<token>",
        {
          metric: metricType,
          shouldavg: shouldavg,
          kind: selectedService.kind,
          name: selectedService.name,
          namespace: namespace,
          startrange: start,
          endrange: end,
          resolution: resolutions[selectedRange],
          pods: [],
        },
        {
          id: project_id,
          cluster_id: cluster_id,
        }
      );

      if (!Array.isArray(res.data) || !res.data[0]?.results) {
        return;
      }
      const autoscalingMetrics = new MetricNormalizer(res.data, metricType);
      setHpaData(autoscalingMetrics.getParsedData());
      return;
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading((prev) => prev - 1);
    }
  };

  const getMetrics = async () => {
    if (
      selectedService == null ||
      selectedMetric == null ||
      selectedRange == null
    ) {
      return;
    }
    try {
      const d = new Date();
      const end = Math.round(d.getTime() / 1000);
      const start = end - secondsBeforeNow[selectedRange];

      setIsLoading((prev) => prev + 1);
      setIndividualData({});
      setAggregatedData({});

      // Get aggregated metrics
      const allPodsRes = await api.getMetrics(
        "<token>",
        {
          metric: selectedMetric,
          shouldavg: false,
          kind: selectedService.kind,
          name: selectedService.name,
          namespace: selectedService.namespace,
          startrange: start,
          endrange: end,
          resolution: resolutions[selectedRange],
          pods: [],
        },
        {
          id: project_id,
          cluster_id: cluster_id,
        }
      );

      const allPodsData: GenericMetricResponse[] = allPodsRes.data ?? [];
      console.log(allPodsData);
      const aggregateMetricsNormalized = new MetricNormalizer(
        [{ results: allPodsData.flatMap((d) => d.results) }],
        selectedMetric as AvailableMetrics
      );
      setAggregatedData(aggregateMetricsNormalized.getAggregatedData());

      let individualMetricsNormalized: Record<
        string,
        NormalizedMetricsData[]
      > = {};
      allPodsData.map((d) => {
        if (d.pod != null) {
          individualMetricsNormalized[d.pod] = new MetricNormalizer(
            [d],
            selectedMetric as AvailableMetrics
          ).getParsedData();
        }
      });
      setIndividualData(individualMetricsNormalized);

      setHpaData([]);
      if (dataGrouping === "aggregate" && showHPA) {
        if (selectedMetric === "cpu") {
          await getAutoscalingThreshold(
            "cpu_hpa_threshold",
            true,
            selectedService.namespace,
            start,
            end
          );
        } else if (selectedMetric === "memory") {
          await getAutoscalingThreshold(
            "memory_hpa_threshold",
            true,
            selectedService.namespace,
            start,
            end
          );
        }
      }
    } catch (error) {
      console.log(JSON.stringify(error));
    } finally {
      setIsLoading((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (selectedMetric && selectedRange && selectedService) {
      getMetrics();
    }
  }, [selectedMetric, selectedRange, selectedService, dataGrouping]);

  const renderServiceDropdown = () => {
    if (serviceDropdownExpanded) {
      return (
        <>
          <DropdownOverlay onClick={() => setServiceDropdownExpanded(false)} />
          <Dropdown
            dropdownWidth="230px"
            dropdownMaxHeight="200px"
            onClick={() => setServiceDropdownExpanded(false)}
          >
            {renderServiceOptionList()}
          </Dropdown>
        </>
      );
    }
  };

  const renderServiceOptionList = () => {
    return services.map((option: Service, i: number) => {
      return (
        <Option
          key={i}
          selected={option === selectedService}
          onClick={() => {
            setSelectedService(option);
          }}
          lastItem={i === metricsOptions.length - 1}
        >
          {option.name}
        </Option>
      );
    });
  };

  const renderMetricDropdown = () => {
    if (metricDropdownExpanded) {
      return (
        <>
          <DropdownOverlay onClick={() => setMetricDropdownExpanded(false)} />
          <Dropdown
            dropdownWidth="230px"
            dropdownMaxHeight="200px"
            onClick={() => setMetricDropdownExpanded(false)}
          >
            {renderMetricOptionList()}
          </Dropdown>
        </>
      );
    }
  };

  const renderMetricOptionList = () => {
    return metricsOptions.map((option: AvailableMetrics, i: number) => {
      return (
        <Option
          key={i}
          selected={option === selectedMetric}
          onClick={() => {
            setSelectedMetric(option);
          }}
          lastItem={i === metricsOptions.length - 1}
        >
          {metricsLabelMap[option].label}
        </Option>
      );
    });
  };

  const firstMetricLabel =
    metricsOptions.length > 0
      ? metricsLabelMap[metricsOptions[0]].label
      : "No metrics available";
  const firstServiceLabel =
    services.length > 0 ? services[0].name : "No services available";

  let dataLegend: Record<string, number> = {};
  if (dataGrouping === "aggregate" && Object.keys(aggregatedData).length) {
    dataLegend = {
      MIN: stats.min(
        aggregatedData.min.map((d) => {
          return d.value;
        })
      ),
      AVG: stats.min(
        aggregatedData.avg.map((d) => {
          return d.value;
        })
      ),
      MAX: stats.min(
        aggregatedData.max.map((d) => {
          return d.value;
        })
      ),
    };
  }
  if (dataGrouping === "individual" && Object.keys(individualData).length) {
    Object.entries(individualData).map(([pod, data]) => {
      dataLegend[pod] = aggregationMap[
        individualAggregationMethod
      ].aggregationFunc(data.map((d) => d.value));
    });
  }

  return (
    <StyledMetricsSection>
      <MetricsHeader>
        <Flex>
          <MetricSelector
            onClick={() => setMetricDropdownExpanded(!metricDropdownExpanded)}
          >
            <MetricsLabel>
              {selectedMetric
                ? metricsLabelMap[selectedMetric].label
                : firstMetricLabel}
            </MetricsLabel>
            <i className="material-icons">arrow_drop_down</i>
            {renderMetricDropdown()}
          </MetricSelector>
          <Spacer x={1} inline />
          <MetricSelector
            onClick={() => setServiceDropdownExpanded(!serviceDropdownExpanded)}
          >
            <MetricsLabel>
              {selectedService ? selectedService.name : firstServiceLabel}
            </MetricsLabel>
            <i className="material-icons">arrow_drop_down</i>
            {renderServiceDropdown()}
          </MetricSelector>

          <Highlight color={"#7d7d81"} onClick={getMetrics}>
            <i className="material-icons">autorenew</i>
          </Highlight>
        </Flex>
        <RangeWrapper>
          <TabSelector<DataGrouping>
            noBuffer={true}
            options={[
              {
                label: "Aggregate",
                value: "aggregate",
              },
              {
                label: "Individual",
                value: "individual",
              },
            ]}
            currentTab={dataGrouping}
            setCurrentTab={(x) => setDataGrouping(x)}
          />
        </RangeWrapper>
        {timeRangeOptions.length > 0 && (
          <RangeWrapper>
            <TabSelector
              noBuffer={true}
              options={timeRangeOptions.map((x) => ({
                label: x,
                value: x,
              }))}
              currentTab={selectedRange || timeRangeOptions[0]}
              setCurrentTab={(x: AvailableTimeRanges) => setSelectedRange(x)}
            />
          </RangeWrapper>
        )}
      </MetricsHeader>
      {isLoading > 0 && <Loading />}
      {Object.keys(aggregatedData).length === 0 && isLoading === 0 && (
        <Message>
          No data available yet.
          <Highlight color={"#8590ff"} onClick={getMetrics}>
            <i className="material-icons">autorenew</i>
            Refresh
          </Highlight>
        </Message>
      )}
      {Object.keys(aggregatedData).length > 0 &&
        isLoading === 0 &&
        selectedMetric &&
        selectedRange && (
          <>
            {autoscaling_enabled &&
              ["cpu", "memory"].includes(selectedMetric) && (
                <CheckboxRow
                  toggle={() => setShowHPA((prev: any) => !prev)}
                  checked={showHPA}
                  label="Show Autoscaling Threshold"
                />
              )}
            <ParentSize>
              {({ width, height }) => (
                <AreaChart
                  dataKey={metricsLabelMap[selectedMetric].label}
                  aggregatedData={
                    dataGrouping === "aggregate"
                      ? aggregatedData
                      : individualData
                  }
                  data={individualData[Object.keys(individualData)[0]]}
                  hpaData={hpaData}
                  hpaEnabled={
                    showHPA && ["cpu", "memory"].includes(selectedMetric)
                  }
                  width={width}
                  height={height - 10}
                  resolution={selectedRange}
                  margin={{ top: 40, right: -40, bottom: 0, left: 50 }}
                />
              )}
            </ParentSize>
            {Object.keys(dataLegend).length && (
              <RowWrapper>
                <DataLegend data={dataLegend} />
              </RowWrapper>
            )}
          </>
        )}
    </StyledMetricsSection>
  );
};

export default MetricsBase;
