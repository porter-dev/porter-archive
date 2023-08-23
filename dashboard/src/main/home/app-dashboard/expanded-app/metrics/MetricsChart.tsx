import React, { useContext, useEffect, useState } from "react";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import axios from "axios"; 
import styled from "styled-components";

import api from "shared/api";
import { ChartTypeWithExtendedConfig } from "shared/types";
import { Context } from "shared/Context";

import AggregatedDataLegend from "../../../cluster-dashboard/expanded-chart/metrics/AggregatedDataLegend";
import StatusCodeDataLegend from "./StatusCodeDataLegend";
import AreaChart from "./AreaChart";
import StackedAreaChart from "./StackedAreaChart";
import CheckboxRow from "components/form-components/CheckboxRow";
import Loading from "components/Loading";
import { AvailableMetrics, GenericMetricResponse, NormalizedMetricsData, NormalizedNginxStatusMetricsData } from "../../../cluster-dashboard/expanded-chart/metrics/types";
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
    isHpaEnabled: boolean;
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
    isHpaEnabled,
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
    const [areaData, setAreaData] = useState<NormalizedNginxStatusMetricsData[]>([]);
    const [hpaData, setHpaData] = useState<NormalizedMetricsData[]>([]);
    const [hpaEnabled, setHpaEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(0);

    const { currentCluster, currentProject, setCurrentError } = useContext(
        Context
    );

    const getMetrics = async () => {
        if (selectedMetric == "nginx:status") {
            getNginxMetrics();
        } else {
            getAppMetrics();
        }
    };

    const getAppMetrics = async () => {
        if (pods?.length == 0) {
            return;
        }

        if (selectedMetric == "nginx:status") {
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

            let kind = selectedController?.kind
            if (selectedMetric == "nginx:status") {
                kind = "Ingress";
            }

            setIsLoading((prev) => prev + 1);
            setAggregatedData({});
            setIsAggregated(shouldsum);
            setHpaEnabled(isHpaEnabled);

            const aggregatedMetricsRequest = api.getMetrics(
                "<token>",
                {
                    metric: selectedMetric,
                    shouldsum: false,
                    kind: kind,
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

            let requests = [
                aggregatedMetricsRequest,
            ];

            if (!shouldsum) {
                const metricsRequest = api.getMetrics(
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
                requests.push(metricsRequest);
            }

            if (shouldsum && isHpaEnabled && ["cpu", "memory"].includes(selectedMetric)) {
                let hpaMetricType = "cpu_hpa_threshold";
                if (selectedMetric === "memory") {
                    hpaMetricType = "memory_hpa_threshold";
                }
                const hpaMetricsRequest = api.getMetrics(
                    "<token>",
                    {
                        metric: hpaMetricType,
                        shouldsum: shouldsum,
                        kind: kind,
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
                requests.push(hpaMetricsRequest);
            }

            axios
                .all(requests)
                .then((responses) => {
                    const allPodsRes = responses[0];
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

                    if (!shouldsum) {
                        const res = responses[1];
                        const metrics = new MetricNormalizer(
                            res.data,
                            selectedMetric as AvailableMetrics
                        );
                        setData(metrics.getParsedData());
                    }

                    if (shouldsum && isHpaEnabled && ["cpu", "memory"].includes(selectedMetric)) {
                        let hpaMetricType = "cpu_hpa_threshold"
                        if (selectedMetric === "memory") {
                            hpaMetricType = "memory_hpa_threshold"
                        }
                        const hpaRes = responses[1];
                        if (!Array.isArray(hpaRes.data) || !hpaRes.data[0]?.results) {
                            return;
                        }
                        const autoscalingMetrics = new MetricNormalizer(hpaRes.data, hpaMetricType as AvailableMetrics);
                        setHpaData(autoscalingMetrics.getParsedData());
                    }
                })
                .catch(error => {
                    setCurrentError(JSON.stringify(error));
                })
        } catch (error) {
            setCurrentError(JSON.stringify(error));
        } finally {
            setIsLoading((prev) => prev - 1);
        }
    };

    const getNginxMetrics = async () => {
        const name = selectedController?.metadata.name
        if (name.length === undefined) {
            return
        }

        if (selectedMetric != "nginx:status") {
            return;
        }

        let requests = [];
        const namespace = currentChart.namespace;
        const kind = "Ingress";

        // calculate start and end range
        const d = new Date();
        const end = Math.round(d.getTime() / 1000);
        const start = end - secondsBeforeNow[selectedRange];

        try {
            setIsLoading((prev) => prev + 1);
            const response = await api.getMetrics(
                "<token>",
                {
                    metric: selectedMetric,
                    shouldsum: false,
                    kind: kind,
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
            let aggregatedMetrics: Record<string, NormalizedMetricsData[]> = {};
            const metrics = new MetricNormalizer(
                response.data,
                selectedMetric as AvailableMetrics
            );

            setAreaData(metrics.getNginxStatusData());
        } catch (error) {
            setCurrentError(JSON.stringify(error));
        } finally {
            setIsLoading((prev) => prev - 1);
        }
    }

    useEffect(() => {
        if (selectedRange && selectedController) {
            getNginxMetrics();
        }
    }, [
        selectedRange,
        selectedController,
    ]);

    useEffect(() => {
        if (selectedRange && selectedPod && selectedController) {
            getAppMetrics();
        }
    }, [
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
            {(data.length === 0 && Object.keys(areaData).length === 0) && isLoading === 0 && (
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
                    {isHpaEnabled &&
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

            {Object.keys(areaData).length > 0 && isLoading === 0 && (
                <>
                    <ParentSize>
                        {({ width, height }) => (
                            <StackedAreaChart
                                dataKey={selectedMetricLabel}
                                data={areaData}
                                width={width}
                                height={height - 10}
                                resolution={selectedRange}
                                margin={{ top: 40, right: -40, bottom: 0, left: 50 }}
                            />
                        )}
                    </ParentSize>
                    <RowWrapper>
                        <StatusCodeDataLegend />
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
  height: calc(100vh - 700px);
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
