import React from "react";
import * as stats from "simple-statistics";
import styled from "styled-components";
import chroma from "chroma-js";
import { NormalizedMetricsData } from "./types";
import { StatusCodeDataColors } from "./utils";

interface StatusCodeDataLegendProps {}

const StatusCodeDataLegend = ({ }: StatusCodeDataLegendProps) => {
  const statusCodes = ["1xx", "2xx", "3xx", "4xx", "5xx"];

  return (
    <StatusCodeDataContainer>
      {statusCodes.map((key) => (
        <StatusCodeDataItem key={key}>
          <DataBar color={StatusCodeDataColors[key]} />
          {key.toUpperCase()}
        </StatusCodeDataItem>
      ))}
    </StatusCodeDataContainer>
  );
};

export default StatusCodeDataLegend;

const StatusCodeDataContainer = styled.div`
  display: flex;
  margin-block: 8px;
`;

const StatusCodeDataItem = styled.div`
  display: flex;
  flex-direction: row;
  height: 20px;
  align-items: center;
  gap: 4px;
`;

const DataBar = styled.div<{ color: string }>`
  height: 10px;
  width: 10px;
  margin-left: 10px;
  border: 1px solid ${(props) => props.color};
  background-color: ${(props) => chroma(props.color).alpha(0.6).css()};
`;
