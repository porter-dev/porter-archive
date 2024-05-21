import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Container from "legacy/components/porter/Container";
import Fieldset from "legacy/components/porter/Fieldset";
import Select from "legacy/components/porter/Select";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { useCustomerPlan, useCustomerUsage } from "legacy/lib/hooks/useLago";

dayjs.extend(utc);

function UsagePage(): JSX.Element {
  const { plan } = useCustomerPlan();
  const planStartDate = dayjs.utc(plan?.starting_on).startOf("month");

  const [currentPeriod, setCurrentPeriod] = useState(
    dayjs().utc().format("MMMM YYYY")
  );
  const [options, setOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [previousPeriodCount, setPreviousPeriodCount] = useState(0);
  const [showCurrentPeriod, setShowCurrentPeriod] = useState(true);

  const { usageList } = useCustomerUsage(
    previousPeriodCount,
    showCurrentPeriod
  );

  useEffect(() => {
    const newOptions = generateOptions();
    setOptions(newOptions);
  }, [previousPeriodCount, showCurrentPeriod]);

  const generateOptions = (): Array<{ value: string; label: string }> => {
    const options = [];
    const monthsElapsed = dayjs
      .utc()
      .startOf("month")
      .diff(planStartDate, "month");

    if (monthsElapsed <= 0) {
      options.push({
        value: currentPeriod,
        label: dayjs().utc().format("MMMM YYYY"),
      });
      setShowCurrentPeriod(true);
      return options;
    }

    setPreviousPeriodCount(monthsElapsed);
    for (let i = 0; i <= monthsElapsed; i++) {
      const optionDate = planStartDate.add(i, "month");
      options.push({
        value: optionDate.format("MMMM YYYY"),
        label: optionDate.format("MMMM YYYY"),
      });
    }

    return options;
  };

  const processedUsage = useMemo(() => {
    if (!usageList?.length) {
      return null;
    }

    const periodUsage = usageList.find(
      (usage) =>
        dayjs(usage.from_datetime).utc().month() ===
        dayjs(currentPeriod).month()
    );

    if (!periodUsage) {
      return null;
    }

    const totalCost = periodUsage?.total_amount_cents
      ? (periodUsage.total_amount_cents / 100).toFixed(4)
      : "0";
    const totalCpuHours =
      periodUsage?.charges_usage.find((x) =>
        x.billable_metric.name.includes("CPU")
      )?.units ?? "";
    const totalGibHours =
      periodUsage?.charges_usage.find((x) =>
        x.billable_metric.name.includes("GiB")
      )?.units ?? "";
    const currency = periodUsage?.charges_usage[0].amount_currency ?? "";

    if (totalCpuHours === "" || totalGibHours === "") {
      return null;
    }

    return {
      total_cost: totalCost,
      total_cpu_hours: totalCpuHours,
      total_gib_hours: totalGibHours,
      currency,
    };
  }, [usageList]);

  return (
    <>
      <Select
        options={options}
        value={currentPeriod}
        setValue={(value) => {
          setCurrentPeriod(value);
          if (dayjs().format("MMMM YYYY") === value) {
            setShowCurrentPeriod(true);
          } else {
            setShowCurrentPeriod(false);
          }
        }}
        width="fit-content"
        prefix={<>Billing period</>}
      />
      <Spacer y={1} />
      {processedUsage ? (
        <>
          <Text color="helper">Total usage (selected period):</Text>
          <Spacer y={0.5} />
          <Container row>
            <Fieldset>
              <Text size={16}>
                $ {processedUsage.total_cost} {processedUsage.currency}
              </Text>
            </Fieldset>
            <Spacer inline x={1} />
            <Fieldset>
              <Text size={16}>{processedUsage.total_gib_hours} GiB hours</Text>
            </Fieldset>
            <Spacer inline x={1} />
            <Fieldset>
              <Text size={16}>{processedUsage.total_cpu_hours} CPU hours</Text>
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
