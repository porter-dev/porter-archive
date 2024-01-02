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
  const [chartDataValues, setChartDataValues] = useState([0, 0, 0]);

  useEffect(() => {
    const counts = { ENABLED: 0, DISABLED: 0, PENDING: 0 };

    Object.values(data.soc2_checks).forEach((check) => {
      const status = check.status || "DISABLED";
      counts[status.toUpperCase()]++;
    });

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
        hoverBorderColor: "#171b21",
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
    responsive: true,
    maintainAspectRatio: false,
  };

  const textCenter = {
    id: "textCenter",
    afterDatasetsDraw: (chart: unknown) => {
      const { ctx, data } = chart;
      ctx.save();
      ctx.font = "15px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Calculate the total
      const total = data.datasets[0].data.reduce((a, b) => a + b, 0);

      // Coordinates for the text
      const x = chart.getDatasetMeta(0).data[0].x;
      const y = chart.getDatasetMeta(0).data[0].y;

      // Draw the first line of text
      ctx.fillText(`${data.datasets[0].data[0]} / ${total}`, x, y - 10); // Adjust Y position as needed

      // Draw the second line of text
      ctx.fillText(`checks enabled`, x, y + 10); // Adjust Y position as needed

      ctx.restore();
    },
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
      <Spacer y={0.5} />
      <Container row>
        <div style={{ width: "300px", height: "300px" }}>
          <Doughnut data={chartData} options={options} plugins={[textCenter]} />
        </div>
        <Spacer inline x={1} />
        <CustomLegend />
      </Container>
    </>
  );
};

export default DonutChart;
