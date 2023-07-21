import React from "react";
import * as stats from "simple-statistics";
import styled from "styled-components";
import chroma from "chroma-js";
import { NormalizedMetricsData } from "./types";
import { AggregatedDataColors, pickColor } from "./utils";

interface AggregatedDataLegendProps {
  data: Record<string, number>;
}

const DataLegend = ({ data }: AggregatedDataLegendProps) => {
  return (
    <AggregatedDataContainer>
      {Object.entries(data).map(([key, value], i) => (
        <AggregatedDataItem>
          <DataBar
            color={pickColor(
              "#4C4F6B",
              "#B04649",
              i,
              Object.entries(data).length
            )}
          />
          {key}: {Math.round(value * 10000) / 10000}
        </AggregatedDataItem>
      ))}
    </AggregatedDataContainer>
  );
};

export default DataLegend;

const AggregatedDataContainer = styled.div`
  display: flex;
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
  height: 10px;
  width: 10px;
  margin-left: 10px;
  border: 1px solid ${(props) => props.color};
  background-color: ${(props) => chroma(props.color).alpha(0.6).css()};
`;
