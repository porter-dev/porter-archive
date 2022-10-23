import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

import settings from "assets/settings.svg";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartTypeWithExtendedConfig, StorageType } from "shared/types";

import TabSelector from "components/TabSelector";
import Loading from "components/Loading";
import SelectRow from "components/form-components/SelectRow";
import AreaChart from "./AreaChart";
import { MetricNormalizer } from "./MetricNormalizer";
import { AvailableMetrics, NormalizedMetricsData } from "./types";
import CheckboxRow from "components/form-components/CheckboxRow";

type PropsType = {
  jobChart: ChartTypeWithExtendedConfig;
  jobRun: any;
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

const JobMetricsSection: React.FunctionComponent<PropsType> = ({
  jobChart: currentChart,
  jobRun,
}) => {
  const [controllerOptions, setControllerOptions] = useState([]);
  const [selectedController, setSelectedController] = useState(null);
  const [ingressOptions, setIngressOptions] = useState([]);
  const [selectedIngress, setSelectedIngress] = useState(null);
  const [selectedRange, setSelectedRange] = useState("1H");
  const [selectedMetric, setSelectedMetric] = useState("cpu");
  const [selectedMetricLabel, setSelectedMetricLabel] = useState(
    "CPU Utilization (vCPUs)"
  );
  const [dropdownExpanded, setDropdownExpanded] = useState(false);
  const [data, setData] = useState<NormalizedMetricsData[]>([]);
  const [showMetricsSettings, setShowMetricsSettings] = useState(false);
  const [metricsOptions, setMetricsOptions] = useState([
    { value: "cpu", label: "CPU Utilization (vCPUs)" },
    { value: "memory", label: "RAM Utilization (Mi)" },
  ]);
  const [isLoading, setIsLoading] = useState(0);
  const [hpaData, setHpaData] = useState([]);
  const [hpaEnabled, setHpaEnabled] = useState(
    currentChart?.config?.autoscaling?.enabled
  );

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  useEffect(() => {
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
          let name = controller?.metadata?.name;
          return { value: controller, label: name };
        });

        setControllerOptions(controllerOptions);
        setSelectedController(controllerOptions[0]?.value);
      })
      .catch((err) => {
        setCurrentError(JSON.stringify(err));
        setControllerOptions([]);
      })
      .finally(() => {
        setIsLoading((prev) => prev - 1);
      });
  }, [currentChart, currentCluster, currentProject]);

  const getAutoscalingThreshold = async (
    metricType: "cpu_hpa_threshold" | "memory_hpa_threshold",
    shouldsum: boolean,
    namespace: string,
    start: number,
    end: number
  ) => {
    setIsLoading((prev) => prev + 1);
    setHpaData([]);
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
    try {
      let namespace = currentChart.namespace;

      const start = Math.round(
        new Date(jobRun?.status?.startTime).getTime() / 1000
      );

      let end = Math.round(
        new Date(jobRun?.status?.completionTime).getTime() / 1000
      );

      if (!jobRun?.status?.completionTime) {
        end = Math.round(new Date().getTime() / 1000);
      }

      setIsLoading((prev) => prev + 1);
      setData([]);

      const res = await api.getMetrics(
        "<token>",
        {
          metric: selectedMetric,
          shouldsum: true,
          kind: "job",
          name: jobRun?.metadata?.name,
          namespace: namespace,
          startrange: start,
          endrange: end,
          resolution: resolutions[selectedRange],
          // pods: podNames,
        },
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );

      if (res.data.length > 0) {
        const metrics = new MetricNormalizer(
          res.data,
          selectedMetric as AvailableMetrics
        );

        // transform the metrics to expected form
        setData(metrics.getParsedData());
      }
    } catch (error) {
      setCurrentError(JSON.stringify(error));
    } finally {
      setIsLoading((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (selectedMetric && selectedRange && selectedController) {
      getMetrics();
    }
  }, [selectedMetric, selectedRange, selectedController, selectedIngress]);

  const renderMetricsSettings = () => {
    if (showMetricsSettings && true) {
      if (selectedMetric == "nginx:errors") {
        return (
          <>
            <DropdownOverlay onClick={() => setShowMetricsSettings(false)} />
            <DropdownAlt dropdownWidth="330px" dropdownMaxHeight="300px">
              <Label>Additional Settings</Label>
              <SelectRow
                label="Target Ingress"
                value={selectedIngress}
                setActiveValue={(x: any) => setSelectedIngress(x)}
                options={ingressOptions}
                width="100%"
              />
            </DropdownAlt>
          </>
        );
      }

      return (
        <>
          <DropdownOverlay onClick={() => setShowMetricsSettings(false)} />
          <DropdownAlt dropdownWidth="330px" dropdownMaxHeight="300px">
            <Label>Additional Settings</Label>
            <SelectRow
              label="Target Controller"
              value={selectedController}
              setActiveValue={(x: any) => setSelectedController(x)}
              options={controllerOptions}
              width="100%"
            />
          </DropdownAlt>
        </>
      );
    }
  };

  const renderDropdown = () => {
    if (dropdownExpanded) {
      return (
        <>
          <DropdownOverlay onClick={() => setDropdownExpanded(false)} />
          <Dropdown
            dropdownWidth="230px"
            dropdownMaxHeight="200px"
            onClick={() => setDropdownExpanded(false)}
          >
            {renderOptionList()}
          </Dropdown>
        </>
      );
    }
  };

  const renderOptionList = () => {
    return metricsOptions.map(
      (option: { value: string; label: string }, i: number) => {
        return (
          <Option
            key={i}
            selected={option.value === selectedMetric}
            onClick={() => {
              setSelectedMetric(option.value);
              setSelectedMetricLabel(option.label);
            }}
            lastItem={i === metricsOptions.length - 1}
          >
            {option.label}
          </Option>
        );
      }
    );
  };

  const hasJobRunnedForMoreThan5m = () => {
    const firstDate = new Date(jobRun.status.startTime);
    const secondDate = jobRun?.status?.completionTime
      ? new Date(jobRun?.status?.completionTime)
      : new Date();
    const _5M_IN_MILISECONDS = 60000;
    return secondDate.getTime() - firstDate.getTime() > _5M_IN_MILISECONDS;
  };

  return (
    <StyledMetricsSection>
      <MetricsHeader>
        <Flex>
          <MetricSelector
            onClick={() => setDropdownExpanded(!dropdownExpanded)}
          >
            <MetricsLabel>{selectedMetricLabel}</MetricsLabel>
            <i className="material-icons">arrow_drop_down</i>
            {renderDropdown()}
          </MetricSelector>

          <Highlight color={"#7d7d81"} onClick={getMetrics}>
            <i className="material-icons">autorenew</i>
          </Highlight>
        </Flex>
      </MetricsHeader>
      {isLoading > 0 && <Loading />}
      {data.length === 0 && isLoading === 0 && (
        <>
          {selectedMetric === "cpu" && hasJobRunnedForMoreThan5m() ? (
            <Message>
              No data available yet.
              <Highlight color={"#8590ff"} onClick={getMetrics}>
                <i className="material-icons">autorenew</i>
                Refresh
              </Highlight>
            </Message>
          ) : (
            <Message>
              <Highlight color={"#8590ff"} disableHover>
                CPU data is not available for jobs that ran for less than 5
                minutes.
              </Highlight>
            </Message>
          )}
        </>
      )}
      {data.length > 0 && isLoading === 0 && (
        <>
          {currentChart?.config?.autoscaling?.enabled &&
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
        </>
      )}
    </StyledMetricsSection>
  );
};

export default JobMetricsSection;

const Highlight = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: ${(props: { color: string; disableHover?: boolean }) => props.color};
  cursor: ${(props) => (props.disableHover ? "unset" : "pointer")};

  > i {
    font-size: 20px;
    margin-right: 3px;
  }
`;

const Label = styled.div`
  font-weight: bold;
`;

const Relative = styled.div`
  position: relative;
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

const IconWrapper = styled.div`
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  border-radius: 30px;
  height: 25px;
  width: 25px;
  margin-left: 8px;
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }
`;

const SettingsIcon = styled.img`
  opacity: 0.4;
  width: 20px;
  height: 20px;
  margin-left: -1px;
  margin-bottom: -2px;
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

const DropdownOverlay = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  z-index: 10;
  left: 0px;
  top: 0px;
  cursor: default;
`;

const Option = styled.div`
  width: 100%;
  border-top: 1px solid #00000000;
  border-bottom: 1px solid
    ${(props: { selected: boolean; lastItem: boolean }) =>
      props.lastItem ? "#ffffff00" : "#ffffff15"};
  height: 37px;
  font-size: 13px;
  padding-top: 9px;
  align-items: center;
  padding-left: 15px;
  cursor: pointer;
  padding-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${(props: { selected: boolean; lastItem: boolean }) =>
    props.selected ? "#ffffff11" : ""};

  :hover {
    background: #ffffff22;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  left: 0;
  top: calc(100% + 10px);
  background: #26282f;
  width: ${(props: { dropdownWidth: string; dropdownMaxHeight: string }) =>
    props.dropdownWidth};
  max-height: ${(props: { dropdownWidth: string; dropdownMaxHeight: string }) =>
    props.dropdownMaxHeight || "300px"};
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  margin-bottom: 20px;
  box-shadow: 0px 4px 10px 0px #00000088;
`;

const DropdownAlt = styled(Dropdown)`
  padding: 20px 20px 7px;
  overflow: visible;
`;

const RangeWrapper = styled.div`
  float: right;
  font-weight: bold;
  width: 156px;
  margin-top: -8px;
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

const MetricsLabel = styled.div`
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 200px;
`;

const StyledMetricsSection = styled.div`
  width: 100%;
  min-height: 400px;
  height: 50vh;
  display: flex;
  flex-direction: column;
  position: relative;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid #ffffff33;
  padding: 18px 22px;
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
