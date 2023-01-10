import React from "react";
import * as stats from "simple-statistics";
import styled from "styled-components";
import chroma from "chroma-js";
import { NormalizedMetricsData } from "./types";
import { AggregatedDataColors } from "./utils";

interface AggregatedDataLegendProps {
  data: NormalizedMetricsData[];
}

const AggregatedDataLegend = ({ data }: AggregatedDataLegendProps) => {
  const min = stats.min(data.map((d) => d.value));
  const avg = stats.mean(data.map((d) => d.value));
  const max = stats.max(data.map((d) => d.value));

  const aggregatedData = {
    min,
    avg,
    max,
  };

  return (
    <AggregatedDataContainer>
      {Object.entries(aggregatedData).map(([key, value]) => (
        <AggregatedDataItem>
          <DataBar color={AggregatedDataColors[key]} />
          {key.toUpperCase()}: {Math.round(value * 10000) / 10000}
        </AggregatedDataItem>
      ))}
    </AggregatedDataContainer>
  );
};

export default AggregatedDataLegend;

const AggregatedDataContainer = styled.div`
  width: 200px;
  display: flex;
  flex-direction: column;
  margin-block: 8px;
`;

const AggregatedDataItem = styled.div`
  display: flex;
  flex-direction: row;
  height: 20px;
  align-items: center;
  gap: 4px;
`;

const DataBar = styled.div<{ color: string }>`
  height: 100%;
  width: 5px;
  border: 1px solid ${(props) => props.color};
  background-color: ${(props) => chroma(props.color).alpha(0.6).css()};
`;
