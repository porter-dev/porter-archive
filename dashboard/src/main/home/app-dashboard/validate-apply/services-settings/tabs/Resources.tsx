import React, { useState } from "react";
import Spacer from "components/porter/Spacer";
import { ClientService } from "lib/porter-apps/services";
import { Controller, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import InputSlider from "components/porter/InputSlider";
import { ControlledInput } from "components/porter/ControlledInput";
import Checkbox from "components/porter/Checkbox";
import Text from "components/porter/Text";
import { match } from "ts-pattern";
import { MIB_TO_GIB, MILI_TO_CORE, RESOURCE_ALLOCATION_RAM_V2, UPPER_BOUND_SMART } from "main/home/app-dashboard/new-app-flow/tabs/utils";
import SmartOptModal from "main/home/app-dashboard/new-app-flow/tabs/SmartOptModal";
import { FormControlLabel, Switch } from "@material-ui/core";
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
  const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);
  const smartLimitRAM = (maxRAM - RESOURCE_ALLOCATION_RAM_V2) * UPPER_BOUND_SMART
  const smartLimitCPU = Math.round((maxCPU - (RESOURCE_ALLOCATION_RAM_V2 * (maxCPU / maxRAM))) * UPPER_BOUND_SMART * 100) / 100
  const autoscalingEnabled = watch(
    `app.services.${index}.config.autoscaling.enabled`
  );

  return (
    <>
      <Spacer y={1} />
      <Spacer y={1} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <StyledIcon
          className="material-icons"
          onClick={() => {
            setShowNeedHelpModal(true)
          }}
        >
          help_outline
        </StyledIcon>
        <Text style={{ marginRight: '10px' }}>Smart Optimization</Text>
        <Switch
          size="small"
          color="primary"
          checked={true}
          onChange={console.log('hi')}
          inputProps={{ 'aria-label': 'controlled' }}
        />
      </div>
      {showNeedHelpModal &&
        <SmartOptModal
          setModalVisible={setShowNeedHelpModal}
        />}

      <Controller
        name={isPredeploy ? `app.predeploy.${index}.cpuCores` : `app.services.${index}.cpuCores`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <InputSlider
            label="CPUs: "
            unit="Cores"
            override={false}
            min={0}
            max={Math.floor((maxCPU - (RESOURCE_ALLOCATION_RAM_V2 * maxCPU / maxRAM)) * 10) / 10}
            color={"#3f51b5"}
            smartLimit={smartLimitCPU}
            value={value.value.toString()}
            setValue={(e) => {
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
        name={isPredeploy ? `app.predeploy.${index}.ramMegabytes` : `app.services.${index}.ramMegabytes`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <InputSlider
            label="RAM: "
            unit="MB"
            min={0}
            smartLimit={smartLimitRAM}
            max={Math.floor((maxRAM - RESOURCE_ALLOCATION_RAM_V2) * 10) / 10}
            color={"#3f51b5"}
            value={(value.value).toString()}
            setValue={(e) => {
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