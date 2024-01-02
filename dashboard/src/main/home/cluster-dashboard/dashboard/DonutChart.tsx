import React, { useEffect, useState } from "react";
import { ArcElement, CategoryScale, Chart, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale);

type DonutChartProps = {
  data: unknown;
};

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const [displayText, setDisplayText] = useState("");
  const [chartDataValues, setChartDataValues] = useState([0, 0, 0]);

  useEffect(() => {
    const counts = { ENABLED: 0, DISABLED: 0, PENDING: 0 };

    Object.values(data.soc2_checks).forEach((check) => {
      const status = check.status || "DISABLED";
      counts[status.toUpperCase()]++;
    });

    setDisplayText(
      `${counts.ENABLED} / ${
        Object.values(data.soc2_checks).length
      } checks enabled`
    );
    setChartDataValues([counts.ENABLED, counts.DISABLED, counts.PENDING]);
  }, [data]); // Dependency array ensures this runs only when `data` changes

  const chartData = {
    labels: ["Enabled", "Disabled", "Pending"],
    datasets: [
      {
        data: chartDataValues,
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
          <div
            style={{
              marginBottom: "20px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {displayText}
          </div>
          <Doughnut data={chartData} options={options} />
        </div>
        <Spacer inline x={1} />
        <CustomLegend />
      </Container>
    </>
  );
};

export default DonutChart;
