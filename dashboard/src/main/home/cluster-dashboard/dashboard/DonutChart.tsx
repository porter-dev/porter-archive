import React from "react";
import { ArcElement, CategoryScale, Chart, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale);

type DonutChartProps = {
  data: unknown;
};

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const countStatusTypes = (): number[] => {
    const counts = { ENABLED: 0, DISABLED: 0, PENDING: 0 };

    Object.values(data.soc2_checks).forEach((check) => {
      const status = check.status || "DISABLED";
      counts[status.toUpperCase()]++;
    });

    return [counts.ENABLED, counts.DISABLED, counts.PENDING];
  };

  const enabledCount = countStatusTypes()[0];
  const totalCount = Object.values(data.soc2_checks).length;
  const displayText = `${enabledCount}/${totalCount} checks enabled`;

  const centerTextPlugin = {
    id: "centerTextPlugin",
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const { width, height } = chart;
      const fontSize = (height / 280).toFixed(2);
      ctx.font = `${fontSize}em sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";

      const textX = Math.round(
        (width - ctx.measureText(displayText).width) / 2
      );
      const textY = height / 2;

      ctx.fillText(displayText, textX, textY);
    },
  };

  const chartData = {
    labels: ["Enabled", "Disabled", "Pending"],
    datasets: [
      {
        data: countStatusTypes(),
        backgroundColor: ["green", "red", "orange"],
        borderColor: ["green", "red", "orange"],
        borderWidth: 2,
        hoverBorderColor: "#2e3032",
        hoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    plugins: {
      legend: false,
      tooltip: {},
      centerTextPlugin: {},
    },
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: "#fff",
        borderAlign: "inner",
        hoverOffset: 8,
      },
    },
    maintainAspectRatio: false,
  };

  Chart.register(centerTextPlugin);

  const CustomLegend = (): JSX.Element => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "start",
      }}
    >
      {chartData.datasets[0].backgroundColor.map((color, index) => (
        <div
          key={index}
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <span
            style={{
              backgroundColor: color,
              width: "12px",
              height: "12px",
              display: "inline-block",
              marginRight: "8px",
            }}
          ></span>
          {chartData.labels[index]}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Container row>
        <div style={{ width: "300px", height: "300px" }}>
          <Doughnut data={chartData} options={options} />
        </div>
        <Spacer inline x={1} />
        <CustomLegend />
      </Container>
    </>
  );
};

export default DonutChart;
