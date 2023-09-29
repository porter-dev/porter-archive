import React, { useCallback } from "react";
import cronstrue from "cronstrue";
import { useFormContext } from "react-hook-form";

import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import { PorterAppFormData } from "lib/porter-apps";
import { ClientService } from "lib/porter-apps/services";
import Text from "components/porter/Text";
import Link from "components/porter/Link";

type MainTabProps = {
  index: number;
  service: ClientService;
  isPredeploy?: boolean;
};

const MainTab: React.FC<MainTabProps> = ({ index, service, isPredeploy = false }) => {
  const { register, watch } = useFormContext<PorterAppFormData>();
  const cron = watch(`app.services.${index}.config.cron.value`);

  const getScheduleDescription = useCallback((cron: string) => {
    try {
      return (
        <Text color="helper">This job runs: {cronstrue.toString(cron)}</Text>
      );
    } catch (err) {
      return (
        <Text color="helper">
          Invalid cron schedule.{" "}
          <Link to={"https://crontab.cronhub.io/"} hasunderline target="_blank">
            Need help?
          </Link>
        </Text>
      );
    }
  }, []);

  return (
    <>
      <Spacer y={1} />
      <ControlledInput
        type="text"
        label="Start command"
        placeholder="ex: sh start.sh"
        width="300px"
        disabled={service.run.readOnly}
        disabledTooltip={"You may only edit this field in your porter.yaml."}
        {...register(isPredeploy ? `app.predeploy.${index}.run.value` : `app.services.${index}.run.value`)}
      />
      {service.config.type === "job" && (
        <>
          <Spacer y={1} />
          <ControlledInput
            type="text"
            label="Cron schedule"
            placeholder="ex: */5 * * * *"
            width="300px"
            disabled={service.config.cron.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
            {...register(`app.services.${index}.config.cron.value`)}
          />
          <Spacer y={0.5} />
          {getScheduleDescription(cron)}
        </>
      )}
    </>
  );
};

export default MainTab;
