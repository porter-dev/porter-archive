import React from "react";
import Spacer from "components/porter/Spacer";
import { ClientService } from "lib/porter-apps/services";
import { Controller, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { ControlledInput } from "components/porter/ControlledInput";
import Checkbox from "components/porter/Checkbox";
import Text from "components/porter/Text";
import { match } from "ts-pattern";
import styled from "styled-components";

type ResourcesProps = {
  index: number;
  maxCPU: number;
  maxRAM: number;
  service: ClientService;
  isPredeploy?: boolean;
};

const Resources: React.FC<ResourcesProps> = ({
  index,
  maxCPU,
  maxRAM,
  service,
  isPredeploy = false,
}) => {
  const { control, register, watch } = useFormContext<PorterAppFormData>();

  const autoscalingEnabled = watch(
    `app.services.${index}.config.autoscaling.enabled`
  );

  const smartOpt = watch(
    `app.services.${index}.smartOptimization`
  );

  const memory = watch(
    `app.services.${index}.ramMegabytes`
  );
  const cpu = watch(
    `app.services.${index}.cpuCores`
  );

  return (
    <>
      <Spacer y={1} />
      <Controller
        name={
          isPredeploy
            ? `app.predeploy.${index}.cpuCores`
            : `app.services.${index}.cpuCores`
        }
        control={control}
        render={({ field: { value, onChange } }) => (
          <IntelligentSlider
            label="CPUs: "
            unit="Cores"
            override={false}
            min={0}
            max={maxCPU}
            color={"#3a48ca"}
            value={value.value.toString()}
            setValue={(e) => {
              if (smartOpt?.value) {
                setValue(
                  `app.services.${index}.ramMegabytes`, {
                  readOnly: false,
                  value: closestMultiplier(0, maxCPU, value.value) * maxRAM
                });
              }
              onChange({
                ...value,
                value: e,
              });
            }}
            step={0.1}
            disabled={value.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
            isSmartOptimizationOn={smartOpt?.value ?? false}
            decimalsToRoundTo={2}
          />
        )}
      />
      <Spacer y={1} />
      <Controller
        name={
          isPredeploy
            ? `app.predeploy.${index}.ramMegabytes`
            : `app.services.${index}.ramMegabytes`
        }
        control={control}
        render={({ field: { value, onChange } }) => (
          <IntelligentSlider
            label="RAM: "
            unit="MB"
            min={0}
            max={maxRAM}
            color={"#3a48ca"}
            value={value.value.toString()}
            setValue={(e) => {
              if (smartOpt?.value) {
                setValue(`app.services.${index}.cpuCores`, {
                  readOnly: false,
                  value: Number((closestMultiplier(0, maxRAM, value.value) * maxCPU).toFixed(2))
                })
              }
              onChange({
                ...value,
                value: e,
              });
            }}
            step={.1}
            disabled={value.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
            isSmartOptimizationOn={smartOpt?.value ?? false}
          />
        )}
      />
      {match(service.config)
        .with({ type: "job" }, () => null)
        .with({ type: "predeploy" }, () => null)
        .otherwise((config) => (
          <>
            <Spacer y={1} />
            <ControlledInput
              type="text"
              label="Instances"
              placeholder="ex: 1"
              disabled={service.instances.readOnly || autoscalingEnabled.value}
              width="300px"
              disabledTooltip={
                service.instances.readOnly
                  ? "You may only edit this field in your porter.yaml."
                  : "Disable autoscaling to specify instances."
              }
              {...register(`app.services.${index}.instances.value`)}
            />
            <Spacer y={1} />
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
                  disabled={value.readOnly}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                >
                  <Text color="helper">
                    Enable autoscaling (overrides instances)
                  </Text>
                </Checkbox>
              )}
            />

            {autoscalingEnabled.value && (
              <>
                <Spacer y={1} />
                <ControlledInput
                  type="text"
                  label="Min instances"
                  placeholder="ex: 1"
                  disabled={
                    config.autoscaling?.minInstances?.readOnly ??
                    !config.autoscaling?.enabled.value
                  }
                  width="300px"
                  disabledTooltip={
                    config.autoscaling?.minInstances?.readOnly
                      ? "You may only edit this field in your porter.yaml."
                      : "Enable autoscaling to specify min instances."
                  }
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
                    config.autoscaling?.maxInstances?.readOnly ??
                    !config.autoscaling?.enabled.value
                  }
                  width="300px"
                  disabledTooltip={
                    config.autoscaling?.maxInstances?.readOnly
                      ? "You may only edit this field in your porter.yaml."
                      : "Enable autoscaling to specify max instances."
                  }
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
                      disabled={value?.readOnly || !config.autoscaling?.enabled}
                      width="300px"
                      setValue={(e) => {
                        onChange({
                          ...value,
                          value: e,
                        });
                      }}
                      disabledTooltip={
                        value?.readOnly
                          ? "You may only edit this field in your porter.yaml."
                          : "Enable autoscaling to specify CPU threshold."
                      }
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
                      disabled={value?.readOnly || !config.autoscaling?.enabled}
                      width="300px"
                      setValue={(e) => {
                        onChange({
                          ...value,
                          value: e,
                        });
                      }}
                      disabledTooltip={
                        value?.readOnly
                          ? "You may only edit this field in your porter.yaml."
                          : "Enable autoscaling to specify RAM threshold."
                      }
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

const StyledIcon = styled.i`
  cursor: pointer;
  font-size: 16px; 
  margin-right : 5px;
  &:hover {
    color: #666;  
  }
`;

const SmartOptHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`
