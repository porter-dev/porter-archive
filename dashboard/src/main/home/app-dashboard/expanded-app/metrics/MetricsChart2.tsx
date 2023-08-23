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
};

const MetricsChart2: React.FunctionComponent<PropsType> = ({
  metric,
}) => {
  // TODO: fix the type-filtering here
  const renderMetric = (metric: Metric) => {
    if (isNginxMetric(metric)) {
      return renderNginxMetric(metric);
    }
    return renderAggregatedMetric(metric as AggregatedMetric);
  }
  const renderAggregatedMetric = (metric: AggregatedMetric) => {
    if (metric)
      return null;
  }

  const renderNginxMetric = (metric: NginxStatusMetric) => {
    return null;
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
      {(data.length === 0 && Object.keys(areaData).length === 0) && (
        <Message>
          No data available yet.
        </Message>
      )}
      {data.length > 0 && (
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
