import React, { useCallback, useMemo } from "react";
import cronstrue from "cronstrue";
import Checkbox from "legacy/components/porter/Checkbox";
import Container from "legacy/components/porter/Container";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import Tooltip from "legacy/components/porter/Tooltip";
import { type PorterAppFormData } from "legacy/lib/porter-apps";
import { type ClientService } from "legacy/lib/porter-apps/services";
import { Controller, useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

type MainTabProps = {
  index: number;
  service: ClientService;
  lifecycleJobType?: "predeploy" | "initdeploy";
};

const MainTab: React.FC<MainTabProps> = ({
  index,
  service,
  lifecycleJobType,
}) => {
  const { register, control, watch } = useFormContext<PorterAppFormData>();
  const cron = watch(`app.services.${index}.config.cron.value`);
  const run = watch(`app.services.${index}.run.value`);
  const predeployRun = watch(`app.predeploy.${index}.run.value`);
  const initdeployRun = watch(`app.initialDeploy.${index}.run.value`);

  const build = watch("app.build");
  const source = watch("source");
  const isRunCommandOptional = useMemo(() => {
    return build.method === "docker" || source.type === "docker-registry";
  }, [build.method, source.type]);

  const getScheduleDescription = useCallback((cron: string) => {
    try {
      return (
        <Text color="helper">
          This job runs: {cronstrue.toString(cron)} UTC
        </Text>
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

  const isStartCommandValid = useMemo(() => {
    const runCommand =
      lifecycleJobType === "predeploy"
        ? predeployRun
        : lifecycleJobType === "initdeploy"
        ? initdeployRun
        : run;
    return runCommand.includes("&&") || runCommand.includes(";");
  }, [lifecycleJobType, predeployRun, run]);

  // if your Docker image has a CMD or ENTRYPOINT
  return (
    <>
      <Spacer y={1} />
      {isRunCommandOptional ? (
        <Tooltip
          content={
            "If your Docker image has a CMD or ENTRYPOINT, you may leave this field empty."
          }
          position={"right"}
        >
          <Text color="helper">Start command (optional)</Text>
        </Tooltip>
      ) : (
        <Container row>
          <Text>Start command</Text>
          <Spacer inline x={0.2} />
          <span style={{ color: "red" }}>*</span>
        </Container>
      )}
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        placeholder="ex: bash ./start.sh"
        width="300px"
        disabled={service.run.readOnly}
        disabledTooltip={"You may only edit this field in your porter.yaml."}
        {...register(
          lifecycleJobType === "predeploy"
            ? `app.predeploy.${index}.run.value`
            : lifecycleJobType === "initdeploy"
            ? `app.initialDeploy.${index}.run.value`
            : `app.services.${index}.run.value`
        )}
      />
      {isStartCommandValid && (
        <>
          <Spacer y={0.5} />
          <Text color="warner">
            Chained commands are not supported at this time. To run multiple
            commands, move all commands into a script that can be run from a
            single endpoint (e.g. bash ./run.sh).
          </Text>
        </>
      )}
      {match(service.config)
        .with({ type: "job" }, (jobConfig) => (
          <>
            <Spacer y={1} />
            <ControlledInput
              type="text"
              label="Cron schedule"
              placeholder="ex: */5 * * * *"
              width="300px"
              disabled={jobConfig.cron.readOnly}
              disabledTooltip={
                "You may only edit this field in your porter.yaml."
              }
              {...register(`app.services.${index}.config.cron.value`)}
            />

            <Spacer y={0.5} />
            {getScheduleDescription(cron)}
            <Spacer y={0.5} />
            <Controller
              name={`app.services.${index}.config.suspendCron.value`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <Checkbox
                  checked={value}
                  disabled={jobConfig.suspendCron?.readOnly}
                  toggleChecked={() => {
                    onChange(!value);
                  }}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                >
                  <Text color="helper">Suspend cron job</Text>
                </Checkbox>
              )}
            />
          </>
        ))
        .otherwise(() => null)}
    </>
  );
};

export default MainTab;
