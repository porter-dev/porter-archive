import React, { useState } from "react";
import Spacer from "components/porter/Spacer";
import { ClientService } from "lib/porter-apps/services";
import { Controller, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { ControlledInput } from "components/porter/ControlledInput";
import Checkbox from "components/porter/Checkbox";
import Text from "components/porter/Text";
import { match } from "ts-pattern";
import styled from "styled-components";
import { Switch } from "@material-ui/core";
import SmartOptModal from "main/home/app-dashboard/new-app-flow/tabs/SmartOptModal";
import { RESOURCE_ALLOCATION_RAM_V2, UPPER_BOUND_SMART } from "main/home/app-dashboard/new-app-flow/tabs/utils";
import IntelligentSlider from "./IntelligentSlider";
import InputSlider from "components/porter/InputSlider";

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
  const { control, register, watch, setValue } = useFormContext<PorterAppFormData>();
  const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);

  const smartLimitCPU = (maxCPU - Math.round((RESOURCE_ALLOCATION_RAM_V2 * (maxCPU / maxRAM) * 100)) / 100) * UPPER_BOUND_SMART
  const smartLimitRAM = Math.round((maxRAM - RESOURCE_ALLOCATION_RAM_V2) * UPPER_BOUND_SMART)

  const autoscalingEnabled = watch(
    `app.services.${index}.config.autoscaling.enabled`
  );

  const smartOpt = watch(
    `app.services.${index}.smartOptimization`
  );

  return (
    <>
      <Spacer y={1} />
      <Controller
        name={isPredeploy ? `app.predeploy.${index}.smartOptimization` : `app.services.${index}.smartOptimization`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <SmartOptHeader>
            <StyledIcon
              className="material-icons"
              onClick={() => {
                setShowNeedHelpModal(true)
              }}
            >
              help_outline
            </StyledIcon>
            <Text>Smart Optimization</Text>
            <Switch
              size="small"
              color="primary"
              checked={value?.value}
              onChange={
                () => {
                  if (!value?.value) {
                    setValue(`app.services.${index}.cpuCores.value`, smartLimitCPU)
                    setValue(`app.services.${index}.ramMegabytes.value`, smartLimitRAM)
                  }
                  onChange({
                    ...value,
                    value: !value?.value,
                  });
                }
              }
              inputProps={{ 'aria-label': 'controlled' }}
            />
          </SmartOptHeader>)} />
      {showNeedHelpModal &&
        <SmartOptModal
          setModalVisible={setShowNeedHelpModal}
        />}
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
            override={!smartOpt?.value}
            min={0}
            max={maxCPU}
            color={"#3f51b5"}
            smartLimit={smartLimitCPU}
            value={value.value.toString()}
            setValue={(e) => {
              if (smartOpt?.value) {
                setValue(`app.services.${index}.smartOptimization.value`, true)
                setValue(`app.services.${index}.ramMegabytes.value`, Math.round((e * (maxRAM / maxCPU) * 10) / 10))
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
            override={!smartOpt?.value}
            smartLimit={smartLimitRAM}
            max={maxRAM}
            color={"#3f51b5"}
            value={(value.value).toString()}
            setValue={(e) => {
              if (smartOpt?.value) {
                setValue(`app.services.${index}.smartOptimization.value`, true)
                setValue(`app.services.${index}.cpuCores.value`, (e * (maxCPU / maxRAM)))
              }
              onChange({
                ...value,
                value: e,
              });
            }}
            step={10}
            disabled={value.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
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
              disabled={
                service.instances.readOnly ?? config.autoscaling?.enabled
              }
              width="300px"
              disabledTooltip={
                service.instances.readOnly
                  ? "You may only edit this field in your porter.yaml."
                  : "Disable autoscaling to specify replicas."
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
