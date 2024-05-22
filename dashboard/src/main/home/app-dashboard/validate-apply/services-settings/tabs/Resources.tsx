import React, { useContext, useEffect, useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import InputSlider from "components/porter/InputSlider";
import Selector from "components/porter/Selector";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useClusterContext } from "main/home/infrastructure-dashboard/ClusterContextProvider";
import { type ClientNodeGroup } from "lib/clusters/types";
import { type PorterAppFormData } from "lib/porter-apps";
import {
  getServiceResourceAllowances,
  type ClientService,
} from "lib/porter-apps/services";

import { Context } from "shared/Context";

import GPUResources from "./GPUResources";
import IntelligentSlider from "./IntelligentSlider";

type ResourcesProps = {
  index: number;
  service: ClientService;
  lifecycleJobType?: "predeploy" | "initdeploy";
};

const Resources: React.FC<ResourcesProps> = ({
  index,
  service,
  lifecycleJobType,
}) => {
  const { control, register, watch, setValue } =
    useFormContext<PorterAppFormData>();
  const { currentProject } = useContext(Context);
  const { nodes, userNodeGroups } = useClusterContext();
  const { maxRamMegabytes, maxCpuCores } = useMemo(() => {
    return getServiceResourceAllowances(nodes, currentProject?.sandbox_enabled);
  }, [nodes]);

  const computeResources = watch(`app.services.${index}.computeResources`);

  const autoscalingEnabled = watch(
    `app.services.${index}.config.autoscaling.enabled`,
    {
      readOnly: false,
      value: false,
    }
  );

  const sleepEnabled = watch(`app.services.${index}.sleep`, {
    readOnly: false,
    value: false,
  });

  const disabledMessage = (
    defaultMessage: string,
    isAsleep?: boolean
  ): string => {
    return isAsleep
      ? "This service is asleep. Disable sleep mode to edit resources."
      : defaultMessage;
  };

  const nodeGroupsWithDeletedNodes = userNodeGroups.concat(
    computeResources.map((cr) => {
      return {
        id: cr.id,
        name: "[deleted]",
        instance_type: "",
        cpu_cores: 0,
        ram_mb: 0,
        gpu_cores: 0,
      };
    })
  );

  const computeResource =
    (computeResources.length > 0 &&
      nodeGroupsWithDeletedNodes.find(
        (ng) => ng.id === computeResources[0].id
      )) ||
    null;

  const cpuCoreLimit = computeResource
    ? computeResource.cpu_cores * 0.75
    : maxCpuCores;
  const ramMbLimit = computeResource
    ? computeResource.ram_mb * 0.75
    : maxRamMegabytes;

  useEffect(() => {
    if (!computeResource && computeResources.length > 0) {
      setValue(`app.services.${index}.computeResources`, []);
    }
  }, [computeResource]);

  return (
    <>
      <Spacer y={1} />
      <Selector<string>
        activeValue={computeResource?.id || "default"}
        width="300px"
        options={nodeGroupsWithDeletedNodes
          .map((ng: ClientNodeGroup) => {
            return {
              value: ng.id,
              label: ng.name,
              key: ng.id,
            };
          })
          .concat([{ value: "default", label: "Default", key: "default" }])}
        setActiveValue={(value: string) => {
          if (value === "default") {
            setValue(`app.services.${index}.computeResources`, []);
            return;
          }

          setValue(`app.services.${index}.computeResources`, [
            {
              id: value,
            },
          ]);
        }}
        label={"Node Group"}
      />
      <Spacer y={1} />
      <Controller
        name={
          lifecycleJobType === "predeploy"
            ? `app.predeploy.${index}.cpuCores`
            : lifecycleJobType === "initdeploy"
            ? `app.initialDeploy.${index}.cpuCores`
            : `app.services.${index}.cpuCores`
        }
        control={control}
        render={({ field: { value, onChange } }) => (
          <IntelligentSlider
            label="CPUs: "
            unit="Cores"
            min={0.1}
            max={cpuCoreLimit}
            color={"#3f51b5"}
            value={value.value.toString()}
            setValue={(e) => {
              onChange({
                ...value,
                value: e,
              });
            }}
            step={0.01}
            disabled={value.readOnly || sleepEnabled?.value}
            disabledTooltip={disabledMessage(
              "You may only edit this field in your porter.yaml.",
              sleepEnabled?.value
            )}
            isSmartOptimizationOn={false}
            decimalsToRoundTo={2}
          />
        )}
      />
      <Spacer y={1} />
      <Controller
        name={
          lifecycleJobType === "predeploy"
            ? `app.predeploy.${index}.ramMegabytes`
            : lifecycleJobType === "initdeploy"
            ? `app.initialDeploy.${index}.ramMegabytes`
            : `app.services.${index}.ramMegabytes`
        }
        control={control}
        render={({ field: { value, onChange } }) => (
          <IntelligentSlider
            label="RAM: "
            unit="MB"
            min={10}
            max={ramMbLimit}
            color={"#3f51b5"}
            value={value.value.toString()}
            setValue={(e) => {
              onChange({
                ...value,
                value: e,
              });
            }}
            step={10}
            disabled={value.readOnly || sleepEnabled?.value}
            disabledTooltip={disabledMessage(
              "You may only edit this field in your porter.yaml.",
              sleepEnabled?.value
            )}
            isSmartOptimizationOn={false}
          />
        )}
      />
      {currentProject?.gpu_enabled && <GPUResources index={index} />}
      {service.config.type !== "job" && (
        <>
          <Spacer y={1} />
          <Text>
            Sleep service
            <a
              href="https://docs.porter.run/configure/basic-configuration#sleep-mode"
              target="_blank"
              rel="noreferrer"
            >
              &nbsp;(?)
            </a>
          </Text>
          <Spacer y={0.5} />
          <Controller
            name={`app.services.${index}.sleep`}
            control={control}
            render={({ field: { value, onChange } }) => (
              <Checkbox
                checked={Boolean(value?.value)}
                disabled={currentProject?.freeze_enabled}
                toggleChecked={() => {
                  onChange({
                    ...value,
                    value: !value?.value,
                  });
                }}
              >
                <Text color="helper">
                  {currentProject?.freeze_enabled
                    ? "Contact support@porter.run to re-enable your project and unsleep services."
                    : "Pause all instances."}
                </Text>
              </Checkbox>
            )}
          />
        </>
      )}
      {match(service.config)
        .with({ type: "job" }, () => null)
        .with({ type: "predeploy" }, () => null)
        .with({ type: "initdeploy" }, () => null)
        .otherwise((config) => (
          <>
            <Spacer y={1} />
            <Text>Instances</Text>
            <Spacer y={0.5} />
            <ControlledInput
              type="text"
              placeholder="ex: 1"
              disabled={
                service.instances.readOnly ||
                autoscalingEnabled.value ||
                sleepEnabled?.value
              }
              width="300px"
              disabledTooltip={disabledMessage(
                service.instances.readOnly
                  ? "You may only edit this field in your porter.yaml."
                  : "Disable autoscaling to specify instances.",
                sleepEnabled?.value
              )}
              {...register(`app.services.${index}.instances.value`)}
            />
            <Spacer y={1} />
            <>
              <Text>
                Autoscaling
                <a
                  href="https://docs.porter.run/configure/autoscaling"
                  target="_blank"
                  rel="noreferrer"
                >
                  &nbsp;(?)
                </a>
              </Text>
              <Spacer y={0.5} />
              <Controller
                name={`app.services.${index}.config.autoscaling.enabled`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Checkbox
                    checked={value.value}
                    toggleChecked={() => {
                      onChange({
                        ...value,
                        value: !value.value,
                      });
                    }}
                    disabled={value.readOnly || sleepEnabled?.value}
                    disabledTooltip={disabledMessage(
                      "You may only edit this field in your porter.yaml.",
                      sleepEnabled?.value
                    )}
                  >
                    <Text color="helper">
                      Enable autoscaling (overrides instances)
                    </Text>
                  </Checkbox>
                )}
              />
            </>
            {autoscalingEnabled.value && (
              <>
                <Spacer y={1} />
                <ControlledInput
                  type="text"
                  label="Min instances"
                  placeholder="ex: 1"
                  disabled={
                    (config.autoscaling?.minInstances?.readOnly ??
                      !config.autoscaling?.enabled.value) ||
                    sleepEnabled?.value
                  }
                  width="300px"
                  disabledTooltip={disabledMessage(
                    config.autoscaling?.minInstances?.readOnly
                      ? "You may only edit this field in your porter.yaml."
                      : "Enable autoscaling to specify min instances.",
                    sleepEnabled?.value
                  )}
                  {...register(
                    `app.services.${index}.config.autoscaling.minInstances.value`
                  )}
                />
                <Spacer y={1} />
                <ControlledInput
                  type="text"
                  label="Max instances"
                  placeholder="ex: 10"
                  disabled={
                    (config.autoscaling?.maxInstances?.readOnly ??
                      !config.autoscaling?.enabled.value) ||
                    sleepEnabled?.value
                  }
                  width="300px"
                  disabledTooltip={disabledMessage(
                    config.autoscaling?.maxInstances?.readOnly
                      ? "You may only edit this field in your porter.yaml."
                      : "Enable autoscaling to specify max instances.",
                    sleepEnabled?.value
                  )}
                  {...register(
                    `app.services.${index}.config.autoscaling.maxInstances.value`
                  )}
                />
                <Spacer y={1} />
                <Controller
                  name={`app.services.${index}.config.autoscaling.cpuThresholdPercent`}
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <InputSlider
                      label="CPU threshold: "
                      unit="%"
                      min={0}
                      max={100}
                      value={value?.value.toString() ?? "50"}
                      disabled={
                        value?.readOnly ||
                        !config.autoscaling?.enabled ||
                        sleepEnabled?.value
                      }
                      width="300px"
                      setValue={(e) => {
                        onChange({
                          ...value,
                          value: e,
                        });
                      }}
                      disabledTooltip={disabledMessage(
                        value?.readOnly
                          ? "You may only edit this field in your porter.yaml."
                          : "Enable autoscaling to specify CPU threshold.",
                        sleepEnabled?.value
                      )}
                    />
                  )}
                />
                <Spacer y={1} />
                <Controller
                  name={`app.services.${index}.config.autoscaling.memoryThresholdPercent`}
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <InputSlider
                      label="RAM threshold: "
                      unit="%"
                      min={0}
                      max={100}
                      value={value?.value.toString() ?? "50"}
                      disabled={
                        value?.readOnly ||
                        !config.autoscaling?.enabled ||
                        sleepEnabled?.value
                      }
                      width="300px"
                      setValue={(e) => {
                        onChange({
                          ...value,
                          value: e,
                        });
                      }}
                      disabledTooltip={disabledMessage(
                        value?.readOnly
                          ? "You may only edit this field in your porter.yaml."
                          : "Enable autoscaling to specify RAM threshold.",
                        sleepEnabled?.value
                      )}
                    />
                  )}
                />
              </>
            )}
          </>
        ))}
    </>
  );
};

export default Resources;
