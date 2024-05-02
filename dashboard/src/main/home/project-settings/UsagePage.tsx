import React, { useMemo, useState } from "react";
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

function UsagePage(): JSX.Element {
  const [currentPeriodStart, setCurrentPeriodStart] = useState("4-17-24");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState("4-17-24");
  const costLimitDays = 30;

  const { usage } = useCustomerUsage("day", true);
  const { costs } = useCustomerCosts(
    currentPeriodStart,
    currentPeriodEnd,
    costLimitDays
  );
  const { plan } = useCustomerPlan();

  const processedData = useMemo(() => {
    const before = usage;
    const resultMap = new Map();

    before?.forEach(
      (metric: {
        metric_name: string;
        usage_metrics: Array<{ starting_on: string; value: number }>;
      }) => {
        const metricName = metric.metric_name.toLowerCase().replace(" ", "_");
        metric.usage_metrics.forEach(({ starting_on, value }) => {
          if (resultMap.has(starting_on)) {
            resultMap.get(starting_on)[metricName] = value;
          } else {
            resultMap.set(starting_on, {
              starting_on: new Date(starting_on).toLocaleDateString("en-US", {
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

  return (
    <>
      <Select
        options={[
          { value: "4-17-24", label: "4/17/24 - 5/17/24" },
          { value: "3-17-24", label: "3/17/24 - 4/17/24" },
          { value: "2-17-24", label: "2/17/24 - 3/17/24" },
          { value: "1-17-24", label: "1/17/24 - 2/17/24" },
          { value: "12-17-23", label: "12/17/23 - 1/17/24" },
        ]}
        value={currentPeriodStart}
        setValue={(value) => {
          setCurrentPeriodStart(value);
        }}
        width="fit-content"
        prefix={<>Billing period</>}
      />
      <Spacer y={1} />
      {/* usage?.length &&
      usage.length > 0 &&
      usage[0].usage_metrics.length > 0 ? ( */}
      {true ? (
        <>
          <BarWrapper>
            <Total>Total cost: $457.58</Total>
            <Bars
              fill="#8784D2"
              yKey="cost"
              xKey="starting_on"
              data={processedData}
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
                data={processedData}
              />
            </BarWrapper>
            <Spacer x={1} inline />
            <BarWrapper>
              <Bars
                title="CPU Hours"
                fill="#5886E0"
                yKey="cpu_hours"
                xKey="starting_on"
                data={processedData}
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
