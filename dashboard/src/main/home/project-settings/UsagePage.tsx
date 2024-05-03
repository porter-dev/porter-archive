import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import styled from "styled-components";

import Fieldset from "components/porter/Fieldset";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  useCustomerCosts,
  useCustomerPlan,
  useCustomerUsage,
} from "lib/hooks/useMetronome";

import Bars from "./Bars";

dayjs.extend(utc);

function UsagePage(): JSX.Element {
  const [currentPeriodStart, setCurrentPeriodStart] = useState<Date | null>(
    null
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);
  const [currentPeriodDuration, setcurrentPeriodDuration] = useState(30);

  const { usage } = useCustomerUsage(
    currentPeriodStart,
    currentPeriodEnd,
    "day"
  );
  const { plan } = useCustomerPlan();
  const { costs } = useCustomerCosts(
    currentPeriodStart,
    currentPeriodEnd,
    currentPeriodDuration
  );
  let totalCost = 0;

  // Initial period setup
  useEffect(() => {
    if (plan) {
      const now = new Date();
      const endDate = dayjs.utc(now).startOf("day").toDate();
      const startDate = dayjs
        .utc(now)
        .subtract(1, "month")
        .startOf("day")
        .toDate();

      // Set the limit to the current period's number of days
      const numberOfDays = startDate.getUTCDate();

      setcurrentPeriodDuration(numberOfDays);
      setCurrentPeriodStart(startDate);
      setCurrentPeriodEnd(endDate);
    }
  }, [plan]);

  const processedUsage = useMemo(() => {
    const before = usage;
    const resultMap = new Map();

    before?.forEach(
      (metric: {
        metric_name: string;
        usage_metrics: Array<{ starting_on: string; value: number }>;
      }) => {
        const metricName = metric.metric_name.toLowerCase().replace(" ", "_");
        metric.usage_metrics.forEach(({ starting_on: startingOn, value }) => {
          if (resultMap.has(startingOn)) {
            resultMap.get(startingOn)[metricName] = value;
          } else {
            resultMap.set(startingOn, {
              starting_on: new Date(startingOn).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              [metricName]: value,
            });
          }
        });
      }
    );

    // Convert the map to an array of values
    const x = Array.from(resultMap.values());
    return x;
  }, [usage]);

  const processedCosts = useMemo(() => {
    return costs?.map((dailyCost) => {
      dailyCost.start_timestamp = new Date(
        dailyCost.start_timestamp
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dailyCost.cost = dailyCost.cost / 100;
      totalCost += dailyCost.cost;
      return dailyCost;
    });
  }, [costs]);

  const generateOptions = (): Array<{ value: string; label: string }> => {
    const options = [];

    let startDate = dayjs.utc(currentPeriodStart);
    const endDate = dayjs.utc(currentPeriodEnd);

    while (startDate.isBefore(endDate)) {
      const nextDate = startDate.add(1, "month");
      options.push({
        value: startDate.format("M-D-YY"),
        label: `${startDate.format("M/D/YY")} - ${nextDate.format("M/D/YY")}`,
      });

      startDate = startDate.add(1, "month");
    }
    return options;
  };

  const options = generateOptions();

  return (
    <>
      <Select
        options={options}
        value={currentPeriodStart}
        setValue={(value) => {
          setCurrentPeriodStart(value);
        }}
        width="fit-content"
        prefix={<>Billing period</>}
      />
      <Spacer y={1} />
      {costs &&
      costs.length > 0 &&
      usage &&
      usage.length > 0 &&
      usage[0].usage_metrics.length > 0 ? (
        <>
          <BarWrapper>
            <Total>Total cost: ${totalCost.toFixed(2)}</Total>
            <Bars
              fill="#8784D2"
              yKey="cost"
              xKey="start_timestamp"
              data={processedCosts}
            />
          </BarWrapper>
          <Spacer y={0.5} />
          <Flex>
            <BarWrapper>
              <Bars
                title="GiB Hours"
                fill="#8784D2"
                yKey="gib_hours"
                xKey="starting_on"
                data={processedUsage}
              />
            </BarWrapper>
            <Spacer x={1} inline />
            <BarWrapper>
              <Bars
                title="CPU Hours"
                fill="#5886E0"
                yKey="cpu_hours"
                xKey="starting_on"
                data={processedUsage}
              />
            </BarWrapper>
          </Flex>
        </>
      ) : (
        <Fieldset>
          <Text color="helper">
            No usage data available for this billing period.
          </Text>
        </Fieldset>
      )}
    </>
  );
}

export default UsagePage;

const Total = styled.div`
  position: absolute;
  top: 20px;
  left: 15px;
  font-size: 13px;
  background: #42444933;
  backdrop-filter: saturate(150%) blur(8px);
  padding: 7px 10px;
  border-radius: 5px;
  border: 1px solid #494b4f;
`;

const Flex = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const BarWrapper = styled.div`
  flex: 1;
  height: 300px;
  min-width: 450px;
  position: relative;
`;
