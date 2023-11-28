import React, { useContext, useState } from "react";
import { Switch } from "@material-ui/core";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import Checkbox from "components/porter/Checkbox";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import InputSlider from "components/porter/InputSlider";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import SmartOptModal from "main/home/app-dashboard/new-app-flow/tabs/SmartOptModal";
import ProvisionClusterModal from "main/home/sidebar/ProvisionClusterModal";
import {
  closestMultiplier,
  lowestClosestResourceMultipler,
} from "lib/hooks/useClusterResourceLimits";
import { type PorterAppFormData } from "lib/porter-apps";
import { type ClientService } from "lib/porter-apps/services";

import { Context } from "shared/Context";
import addCircle from "assets/add-circle.png";
import infra from "assets/cluster.svg";

import IntelligentSlider from "./IntelligentSlider";

type ResourcesProps = {
  index: number;
  maxCPU: number;
  maxRAM: number;
  service: ClientService;
  isPredeploy?: boolean;
  clusterContainsGPUNodes: boolean;
};

const Resources: React.FC<ResourcesProps> = ({
  index,
  maxCPU,
  maxRAM,
  service,
  clusterContainsGPUNodes,
  isPredeploy = false,
}) => {
  const { control, register, watch, setValue } =
    useFormContext<PorterAppFormData>();
  const [showNeedHelpModal, setShowNeedHelpModal] = useState(false);
  const [clusterModalVisible, setClusterModalVisible] =
    useState<boolean>(false);
  const { currentCluster, currentProject } = useContext(Context);

  const autoscalingEnabled = watch(
    `app.services.${index}.config.autoscaling.enabled`,
    {
      readOnly: false,
      value: false,
    }
  );

  const smartOpt = watch(`app.services.${index}.smartOptimization`, {
    readOnly: false,
    value: false,
  });

  const memory = watch(`app.services.${index}.ramMegabytes`, {
    readOnly: false,
    value: 0,
  });
  const cpu = watch(`app.services.${index}.cpuCores`, {
    readOnly: false,
    value: 0,
  });

  return (
    <>
      <Spacer y={1} />
      <Controller
        name={
          isPredeploy
            ? `app.predeploy.${index}.smartOptimization`
            : `app.services.${index}.smartOptimization`
        }
        control={control}
        render={({ field: { value, onChange } }) => (
          <SmartOptHeader>
            <StyledIcon
              className="material-icons"
              onClick={() => {
                setShowNeedHelpModal(true);
              }}
            >
              help_outline
            </StyledIcon>
            <Text>Smart Optimization</Text>
            <Switch
              size="small"
              color="primary"
              disabled={
                memory.readOnly ||
                cpu.readOnly ||
                service.smartOptimization?.readOnly
              }
              checked={value?.value}
              onChange={() => {
                if (!value?.value) {
                  const lowestRAM = lowestClosestResourceMultipler(
                    0,
                    maxRAM,
                    memory.value
                  );
                  const lowestCPU = lowestClosestResourceMultipler(
                    0,
                    maxCPU,
                    cpu.value
                  );
                  const lowestFraction = Math.min(lowestRAM, lowestCPU);
                  setValue(`app.services.${index}.cpuCores`, {
                    readOnly: false,
                    value: Number((maxCPU * lowestFraction).toFixed(2)),
                  });
                  setValue(`app.services.${index}.ramMegabytes`, {
                    readOnly: false,
                    value: maxRAM * lowestFraction,
                  });
                }
                onChange({
                  ...value,
                  value: !value?.value,
                });
              }}
              inputProps={{ "aria-label": "controlled" }}
            />
          </SmartOptHeader>
        )}
      />
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
            min={0}
            max={maxCPU}
            color={"#3f51b5"}
            value={value.value.toString()}
            setValue={(e) => {
              if (smartOpt?.value) {
                setValue(`app.services.${index}.ramMegabytes`, {
                  readOnly: false,
                  value: Number(
                    (
                      closestMultiplier(0, maxCPU, value.value) * maxRAM
                    ).toFixed(0)
                  ),
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
            color={"#3f51b5"}
            value={value.value.toString()}
            setValue={(e) => {
              if (smartOpt?.value) {
                setValue(`app.services.${index}.cpuCores`, {
                  readOnly: false,
                  value: Number(
                    (
                      closestMultiplier(0, maxRAM, value.value) * maxCPU
                    ).toFixed(2)
                  ),
                });
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
            isSmartOptimizationOn={smartOpt?.value ?? false}
          />
        )}
      />

      {currentCluster?.cloud_provider === "AWS" &&
        currentProject?.gpu_enabled && (
          <>
            <Spacer y={1} />
            <Controller
              name={`app.services.${index}.gpuCoresNvidia`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <>
                  <Container row>
                    <Switch
                      size="small"
                      color="primary"
                      checked={value.value > 0}
                      disabled={!clusterContainsGPUNodes}
                      onChange={() => {
                        if (value.value > 0) {
                          onChange({
                            ...value,
                            value: 0,
                          });
                        } else
                          onChange({
                            ...value,
                            value: 1,
                          });
                      }}
                      inputProps={{ "aria-label": "controlled" }}
                    />
                    <Spacer inline x={0.5} />
                    <Text>
                      <>
                        <span>Enable GPU</span>
                      </>
                    </Text>
                    {!clusterContainsGPUNodes && (
                      <>
                        <Spacer inline x={1} />
                        <Text color="helper">
                          You cluster has no GPU nodes available.
                        </Text>
                        <Spacer inline x={0.5} />
                        <Tag>
                          <Link
                            onClick={() => {
                              setClusterModalVisible(true);
                            }}
                          >
                            <TagIcon src={addCircle} />
                            Add GPU nodes
                          </Link>
                        </Tag>
                      </>
                    )}
                  </Container>

                  <Spacer y={0.5} />
                  {clusterModalVisible && (
                    <ProvisionClusterModal
                      closeModal={() => {
                        setClusterModalVisible(false);
                      }}
                      gpuModal={true}
                    />
                  )}
                </>
              )}
            />
            {currentCluster.status === "UPDATING" &&
              clusterContainsGPUNodes && (
                <CheckItemContainer>
                  <CheckItemTop>
                    <Loading offset="0px" width="20px" height="20px" />
                    <Spacer inline x={1} />
                    <Text>{"Creating GPU nodes..."}</Text>
                    <Spacer inline x={1} />
                    <Tag>
                      <Link to={`/cluster-dashboard`}>
                        <TagIcon src={infra} />
                        View Status
                      </Link>
                    </Tag>
                  </CheckItemTop>
                </CheckItemContainer>
              )}
          </>
        )}
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
            {!clusterContainsGPUNodes && (
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
            )}
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
  margin-right: 5px;
  &:hover {
    color: #666;
  }
`;

const SmartOptHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const CheckItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
  font-size: 13px;
  width: 100%;
  margin-bottom: 10px;
  padding-left: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const CheckItemTop = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background: ${(props) => props.theme.clickable.bg};
`;

const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;
