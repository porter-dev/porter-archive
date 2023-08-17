import React, { useContext, useEffect, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import styled from "styled-components";

import api from "shared/api";
import { ChartTypeWithExtendedConfig } from "shared/types";
import { Context } from "shared/Context";

import AggregatedDataLegend from "../../../cluster-dashboard/expanded-chart/metrics/AggregatedDataLegend";
import AreaChart from "./AreaChart";
import CheckboxRow from "components/form-components/CheckboxRow";
import Loading from "components/Loading";
import TabSelector from "components/TabSelector";
import { AvailableMetrics, GenericMetricResponse, NormalizedMetricsData } from "../../../cluster-dashboard/expanded-chart/metrics/types";
import { MetricNormalizer } from "../../../cluster-dashboard/expanded-chart/metrics/MetricNormalizer";

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

type PropsType = {
    currentChart: ChartTypeWithExtendedConfig;
    pods: any[];
    selectedController: any;
    selectedIngress: any;
    selectedMetric: string;
    selectedMetricLabel: string;
    selectedPod: string;
    selectedRange: string;
};

const MetricsChart: React.FunctionComponent<PropsType> = ({
    currentChart,
    pods,
    selectedController,
    selectedIngress,
    selectedMetric,
    selectedMetricLabel,
    selectedPod,
    selectedRange,
}) => {
    const [isAggregated, setIsAggregated] = useState<boolean>(false);
    const [aggregatedData, setAggregatedData] = useState<
        Record<string, NormalizedMetricsData[]>
    >({});
    const [data, setData] = useState<NormalizedMetricsData[]>([]);
    const [hpaData, setHpaData] = useState<NormalizedMetricsData[]>([]);
    const [hpaEnabled, setHpaEnabled] = useState(false);
    const [showHpaToggle, setShowHpaToggle] = useState(false);
    const [isLoading, setIsLoading] = useState(0);

    const { currentCluster, currentProject, setCurrentError } = useContext(
        Context
    );

    const getAutoscalingThreshold = async (
        metricType: "cpu_hpa_threshold" | "memory_hpa_threshold",
        shouldsum: boolean,
        namespace: string,
        start: number,
        end: number
    ) => {
        setIsLoading((prev) => prev + 1);

        try {
            const res = await api.getMetrics(
                "<token>",
                {
                    metric: metricType,
                    shouldsum: shouldsum,
                    kind: selectedController?.kind,
                    name: selectedController?.metadata.name,
                    namespace: namespace,
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
        if (pods?.length == 0) {
            return;
        }
        try {
            let shouldsum = selectedPod === "All";
            let namespace = currentChart.namespace;

            // calculate start and end range
            const d = new Date();
            const end = Math.round(d.getTime() / 1000);
            const start = end - secondsBeforeNow[selectedRange];

            let podNames = [] as string[];

            if (!shouldsum) {
                podNames = [selectedPod];
            }

            if (selectedMetric == "nginx:errors") {
                podNames = [selectedIngress?.name];
                namespace = selectedIngress?.namespace || "default";
                shouldsum = false;
            }

            setIsLoading((prev) => prev + 1);
            setAggregatedData({});
            setIsAggregated(shouldsum)

            // Get aggregated metrics
            const allPodsRes = await api.getMetrics(
                "<token>",
                {
                    metric: selectedMetric,
                    shouldsum: false,
                    kind: selectedController?.kind,
                    name: selectedController?.metadata.name,
                    namespace: namespace,
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

            const allPodsData: GenericMetricResponse[] = allPodsRes.data ?? [];
            const allPodsMetrics = allPodsData.flatMap((d) => d.results);
            const allPodsMetricsNormalized = new MetricNormalizer(
                [{ results: allPodsMetrics }],
                selectedMetric as AvailableMetrics,
            );
            const allPodsAggregatedData = allPodsMetricsNormalized.getAggregatedData()
            if (shouldsum) {
                setData(allPodsAggregatedData["avg"])
                delete allPodsAggregatedData["avg"]
            }
            setAggregatedData(allPodsAggregatedData);

            const res = await api.getMetrics(
                "<token>",
                {
                    metric: selectedMetric,
                    shouldsum: shouldsum,
                    kind: kind,
                    name: selectedController?.metadata.name,
                    namespace: namespace,
                    startrange: start,
                    endrange: end,
                    resolution: resolutions[selectedRange],
                    pods: podNames,
                },
                {
                    id: currentProject.id,
                    cluster_id: currentCluster.id,
                }
            );

            const metrics = new MetricNormalizer(
                res.data,
                selectedMetric as AvailableMetrics
            );
            // transform the metrics to expected form
            setData(metrics.getParsedData());

            const serviceName: string = selectedController?.metadata.labels["app.kubernetes.io/name"]
            const isHpaEnabled: boolean = currentChart?.config?.[serviceName]?.autoscaling?.enabled
            setShowHpaToggle(isHpaEnabled);
            setHpaEnabled(isHpaEnabled);
            if (shouldsum && isHpaEnabled) {
                if (selectedMetric === "cpu") {
                    await getAutoscalingThreshold(
                        "cpu_hpa_threshold",
                        shouldsum,
                        namespace,
                        start,
                        end
                    );
                } else if (selectedMetric === "memory") {
                    await getAutoscalingThreshold(
                        "memory_hpa_threshold",
                        shouldsum,
                        namespace,
                        start,
                        end
                    );
                }
            }
        } catch (error) {
            setCurrentError(JSON.stringify(error));
        } finally {
            setIsLoading((prev) => prev - 1);
        }
    };

    useEffect(() => {
        if (selectedMetric && selectedRange && selectedPod && selectedController) {
            getMetrics();
        }
    }, [
        selectedMetric,
        selectedRange,
        selectedPod,
        selectedController,
        selectedIngress,
        pods,
    ]);

    return (
        <StyledMetricsChart>
            <MetricsHeader>
                <Flex>
                    <MetricSelector>
                        <MetricsLabel>{selectedMetricLabel}</MetricsLabel>
                    </MetricSelector>

                    <Highlight color={"#7d7d81"} onClick={getMetrics}>
                        <i className="material-icons">autorenew</i>
                    </Highlight>
                </Flex>
            </MetricsHeader>
            {isLoading > 0 && <Loading />}
            {data.length === 0 && isLoading === 0 && (
                <Message>
                    No data available yet.
                    <Highlight color={"#8590ff"} onClick={getMetrics}>
                        <i className="material-icons">autorenew</i>
                        Refresh
                    </Highlight>
                </Message>
            )}
            {data.length > 0 && isLoading === 0 && (
                <>
                    {showHpaToggle &&
                        ["cpu", "memory"].includes(selectedMetric) && (
                            <CheckboxRow
                                toggle={() => setHpaEnabled((prev: any) => !prev)}
                                checked={hpaEnabled}
                                label="Show Autoscaling Threshold"
                            />
                        )}
                    <ParentSize>
                        {({ width, height }) => (
                            <AreaChart
                                dataKey={selectedMetricLabel}
                                aggregatedData={aggregatedData}
                                isAggregated={isAggregated}
                                data={data}
                                hpaData={hpaData}
                                hpaEnabled={
                                    hpaEnabled && ["cpu", "memory"].includes(selectedMetric)
                                }
                                width={width}
                                height={height - 10}
                                resolution={selectedRange}
                                margin={{ top: 40, right: -40, bottom: 0, left: 50 }}
                            />
                        )}
                    </ParentSize>
                    <RowWrapper>
                        <AggregatedDataLegend data={data} hideAvg={isAggregated} />
                    </RowWrapper>
                </>
            )}
        </StyledMetricsChart>
    );
};

export default MetricsChart;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const Highlight = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: ${(props: { color: string }) => props.color};
  cursor: pointer;

  > i {
    font-size: 20px;
    margin-right: 3px;
  }
`;

const Message = styled.div`
  display: flex;
  height: 100%;
  width: calc(100% - 150px);
  align-items: center;
  justify-content: center;
  margin-left: 75px;
  text-align: center;
  color: #ffffff44;
  font-size: 13px;
`;

const MetricsHeader = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  overflow: visible;
  justify-content: space-between;
`;

const MetricsLabel = styled.div`
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 200px;
`;

const MetricSelector = styled.div`
  font-size: 13px;
  font-weight: 500;
  position: relative;
  color: #ffffff;
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: 5px;
  :hover {
    > i {
      background: #ffffff22;
    }
  }

  > i {
    border-radius: 20px;
    font-size: 20px;
    margin-left: 10px;
  }
`;

const RowWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
`;


const StyledMetricsChart = styled.div`
  width: 100%;
  min-height: 240px;
  height: calc(100vh - 800px);
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  animation: floatIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
