import React, { useContext, useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import InputSlider from "components/porter/InputSlider";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SmartOptModal from "main/home/app-dashboard/new-app-flow/tabs/SmartOptModal";
import { useClusterContext } from "main/home/infrastructure-dashboard/ClusterContextProvider";
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
  isPredeploy?: boolean;
};

const Resources: React.FC<ResourcesProps> = ({
  index,
  service,
  isPredeploy = false,
}) => {
  const { control, register, watch } = useFormContext<PorterAppFormData>();
  const { currentProject } = useContext(Context);
  const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);
  const { nodes } = useClusterContext();
  const { maxRamMegabytes, maxCpuCores } = useMemo(() => {
    return getServiceResourceAllowances(nodes, currentProject?.sandbox_enabled);
  }, [nodes]);

  const autoscalingEnabled = watch(
    `app.services.${index}.config.autoscaling.enabled`,
    {
      readOnly: false,
      value: false,
    }
  );

  return (
    <>
      <Spacer y={1} />
      {showNeedHelpModal && (
        <SmartOptModal setModalVisible={setShowNeedHelpModal} />
      )}
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
            min={0.1}
            max={maxCpuCores}
            color={"#3f51b5"}
            value={value.value.toString()}
            setValue={(e) => {
              onChange({
                ...value,
                value: e,
              });
            }}
            step={0.01}
            disabled={value.readOnly}
            disabledTooltip={
              "You may only edit this field in your porter.yaml."
            }
            isSmartOptimizationOn={false}
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
            min={10}
            max={maxRamMegabytes}
            color={"#3f51b5"}
            value={value.value.toString()}
            setValue={(e) => {
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
            isSmartOptimizationOn={false}
          />
        )}
      />

      {currentProject?.gpu_enabled && <GPUResources index={index} />}
      {match(service.config)
        .with({ type: "job" }, () => null)
        .with({ type: "predeploy" }, () => null)
        .otherwise((config) => (
          <>
            <Spacer y={1} />
            <Text>Instances</Text>
            <Spacer y={0.5} />
            <ControlledInput
              type="text"
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
            </>
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
