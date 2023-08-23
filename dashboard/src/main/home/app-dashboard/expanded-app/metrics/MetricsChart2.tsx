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
import { MetricNormalizer } from "./utils";
import { AggregatedMetric, Metric, NginxStatusMetric, isNginxMetric } from "./types";

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
  metric: Metric;
  selectedRange: string;
};

const MetricsChart2: React.FunctionComponent<PropsType> = ({
  metric,
  selectedRange,
}) => {
  const [showAutoscalingLine, setShowAutoscalingLine] = useState(false);
  // TODO: fix the type-filtering here
  const renderMetric = (metric: Metric) => {
    if (isNginxMetric(metric)) {
      return renderNginxMetric(metric);
    }
    return renderAggregatedMetric(metric as AggregatedMetric);
  }
  const renderAggregatedMetric = (metric: AggregatedMetric) => {
    if (metric.data.length === 0) {
      return (
        <Message>
          No data available yet.
        </Message>
      )
    }
    return (
      <>
        {metric.hpaData.length > 0 &&
          <CheckboxRow
            toggle={() => setShowAutoscalingLine((prev: any) => !prev)}
            checked={showAutoscalingLine}
            label="Show Autoscaling Threshold"
          />
        }
        <ParentSize>
          {({ width, height }) => (
            <AreaChart
              dataKey={metric.label}
              aggregatedData={metric.aggregatedData}
              isAggregated={true}
              data={metric.data}
              hpaData={metric.hpaData}
              hpaEnabled={showAutoscalingLine}
              width={width}
              height={height - 10}
              resolution={selectedRange}
              margin={{ top: 40, right: -40, bottom: 0, left: 50 }}
            />
          )}
        </ParentSize>
        <RowWrapper>
          <AggregatedDataLegend data={metric.data} hideAvg={true} />
        </RowWrapper>
      </>
    )
  }

  const renderNginxMetric = (metric: NginxStatusMetric) => {
    if (metric.areaData.length === 0) {
      return (
        <Message>
          No data available yet.
        </Message>
      );
    }

    return (
      <>
        <ParentSize>
          {({ width, height }) => (
            <StackedAreaChart
              dataKey={metric.label}
              data={metric.areaData}
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
    )
  }

  return (
    <StyledMetricsChart>
      <MetricsHeader>
        <Flex>
          <MetricSelector>
            <MetricsLabel>{metric.label}</MetricsLabel>
          </MetricSelector>
        </Flex>
      </MetricsHeader>
      {renderMetric(metric)}
    </StyledMetricsChart>
  );
};

export default MetricsChart2;

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
