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

const JobMetricsSection: React.FunctionComponent<PropsType> = ({
  jobChart: currentChart,
  jobRun,
}) => {
  const [selectedRange, setSelectedRange] = useState("1H");
  const [selectedMetric, setSelectedMetric] = useState("cpu");
  const [selectedMetricLabel, setSelectedMetricLabel] = useState(
    "CPU Utilization (vCPUs)"
  );
  const [dropdownExpanded, setDropdownExpanded] = useState(false);
  const [data, setData] = useState<NormalizedMetricsData[]>([]);
  const [metricsOptions, setMetricsOptions] = useState([
    { value: "cpu", label: "CPU Utilization (vCPUs)" },
    { value: "memory", label: "RAM Utilization (Mi)" },
  ]);
  const [isLoading, setIsLoading] = useState(0);

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  // prometheus has a limit of 11,000 data points to return per metric. we thus ensure that
  // the resolution will not exceed 11,000 data points.
  //
  // This breaks down if the job runs for over 6 years.
  const getJobResolution = (start: number, end: number) => {
    let duration = end - start;
    if (duration <= 3600) {
      return "1s";
    } else if (duration <= 54000) {
      return "15s";
    } else if (duration <= 216000) {
      return "60s";
    }

    return "5h";
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
          shouldavg: true,
          kind: "job",
          name: jobRun?.metadata?.name,
          namespace: namespace,
          startrange: start,
          endrange: end,
          resolution: getJobResolution(start, end),
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
    if (selectedMetric && selectedRange) {
      getMetrics();
    }
  }, [selectedMetric, selectedRange]);

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
          <ParentSize>
            {({ width, height }) => (
              <AreaChart
                dataKey={selectedMetricLabel}
                data={data}
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
