import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import styled from "styled-components";

import Container from "components/porter/Container";
import Fieldset from "components/porter/Fieldset";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type CostList } from "lib/billing/types";
import {
  useCustomerCosts,
  useCustomerPlan,
  useCustomerUsage,
} from "lib/hooks/useLago";

import Bars from "./Bars";

dayjs.extend(utc);

function UsagePage(): JSX.Element {
  const { plan } = useCustomerPlan();

  const startDate = dayjs.utc(plan?.starting_on);
  const endDate = dayjs().utc().startOf("day");
  const numberOfDays = startDate.daysInMonth();

  const [currentPeriodStart, setCurrentPeriodStart] = useState(
    startDate.toDate()
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(endDate.toDate());
  const [currentPeriodDuration, setCurrentPeriodDuration] =
    useState(numberOfDays);

  const { usage } = useCustomerUsage(
    currentPeriodStart,
    currentPeriodEnd,
    "day"
  );
  const { costs } = useCustomerCosts(
    currentPeriodStart,
    currentPeriodEnd,
    currentPeriodDuration
  );

  const computeTotalCost = (costs: CostList): number => {
    const total = costs.reduce((acc, curr) => acc + curr.cost, 0);
    return parseFloat(total.toFixed(2));
  };

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
    return costs
      ?.map((dailyCost) => {
        dailyCost.start_timestamp = new Date(
          dailyCost.start_timestamp
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        dailyCost.cost = parseFloat((dailyCost.cost / 100).toFixed(4));
        return dailyCost;
      })
      .filter((dailyCost) => dailyCost.cost > 0);
  }, [costs]);

  const generateOptions = (): Array<{ value: string; label: string }> => {
    const options = [];

    let startDate = dayjs.utc(currentPeriodStart);
    const endDate = dayjs.utc(currentPeriodEnd);

    while (startDate.isBefore(endDate)) {
      const nextDate = startDate.add(1, "month");
      options.push({
        value: startDate.toISOString(),
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
        value={currentPeriodStart.toISOString()}
        setValue={(value) => {
          setCurrentPeriodStart(dayjs.utc(value).toDate());
          setCurrentPeriodEnd(dayjs.utc(value).add(1, "month").toDate());
          setCurrentPeriodDuration(dayjs.utc(value).daysInMonth());
        }}
        width="fit-content"
        prefix={<>Billing period</>}
      />
      <Spacer y={1} />
      {processedCosts &&
      processedCosts.length > 0 &&
      processedUsage &&
      processedUsage.length > 0 ? (
        <>
          <Text color="helper">Total usage (selected period):</Text>
          <Spacer y={0.5} />
          <Container row>
            <Fieldset>
              <Text size={16}>$ 26.78</Text>
            </Fieldset>
            <Spacer inline x={1} />
            <Fieldset>
              <Text size={16}>5.18 GiB hours</Text>
            </Fieldset>
            <Spacer inline x={1} />
            <Fieldset>
              <Text size={16}>1.78 CPU hours</Text>
            </Fieldset>
          </Container>
          <Spacer y={1} />
          <Text color="helper">Daily average (selected period):</Text>
          <Spacer y={0.5} />
          <Container row>
            <Fieldset>
              <Text size={16}>$ 3.62</Text>
            </Fieldset>
            <Spacer inline x={1} />
            <Fieldset>
              <Text size={16}>0.51 GiB hours</Text>
            </Fieldset>
            <Spacer inline x={1} />
            <Fieldset>
              <Text size={16}>0.18 CPU hours</Text>
            </Fieldset>
          </Container>
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
  left: 55px;
  font-size: 13px;
  background: #42444933;
  backdrop-filter: saturate(150%) blur(8px);
  padding: 7px 10px;
  border-radius: 5px;
  border: 1px solid #494b4f;
  z-index: 999;
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
