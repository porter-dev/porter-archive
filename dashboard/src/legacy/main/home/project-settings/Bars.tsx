import React from "react";
import Text from "legacy/components/porter/Text";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import styled from "styled-components";

type Props = {
  data: Array<Record<string, unknown>>;
  yKey: string;
  xKey: string;
  fill?: string;
  title?: string;
};

const CustomTooltip = ({ active, payload }: TooltipProps<string, string>) => {
  if (active && payload?.length) {
    return (
      <div
        className="custom-tooltip"
        style={{
          backgroundColor: "#42444933",
          backdropFilter: "saturate(150%) blur(8px)",
          border: "1px solid #494b4f",
          fontSize: "13px",
          padding: "10px",
          borderRadius: "5px",
          color: "white",
        }}
      >
        <p className="intro">{`Value: ${payload[0].value}`}</p>
      </div>
    );
  }

  return null;
};

const Bars: React.FC<Props> = ({ data, yKey, xKey, fill, title }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 5,
          right: 0,
          left: -20,
          bottom: 5,
        }}
      >
        <CartesianGrid vertical={false} stroke="#ffffff22" />
        <XAxis dataKey={xKey} tick={{ fontSize: 13 }} />
        <YAxis tick={{ fontSize: 13 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff11" }} />
        <Bar dataKey={yKey} fill={fill || "#6A7FC4"} />
      </BarChart>
      <Center>
        <Text color="helper">{title}</Text>
      </Center>
    </ResponsiveContainer>
  );
};

export default Bars;

const Center = styled.div`
  text-align: center;
`;
