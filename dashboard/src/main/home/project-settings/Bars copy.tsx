import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styled from "styled-components";

import Text from "components/porter/Text";

type Props = {
  data: any;
  yKey: string;
  xKey: string;
  fill?: string;
  title?: string;
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
        <Tooltip wrapperStyle={{ background: "red" }} />
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
