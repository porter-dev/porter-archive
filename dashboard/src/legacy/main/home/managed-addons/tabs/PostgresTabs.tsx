import React, { useMemo, useState } from "react";
import copy from "legacy/assets/copy-left.svg";
import CopyToClipboard from "legacy/components/CopyToClipboard";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import TabSelector from "legacy/components/TabSelector";
import { type ClientAddon } from "legacy/lib/addons";
import { getServiceResourceAllowances } from "legacy/lib/porter-apps/services";
import { Controller, useFormContext } from "react-hook-form";
import { match, P } from "ts-pattern";

import IntelligentSlider from "main/home/app-dashboard/validate-apply/services-settings/tabs/IntelligentSlider";
import { type AppTemplateFormData } from "main/home/cluster-dashboard/preview-environments/v2/EnvTemplateContextProvider";
import { useClusterContext } from "main/home/infrastructure-dashboard/ClusterContextProvider";

import { Code, CopyContainer, CopyIcon, IdContainer } from "./shared";

type Props = {
  index: number;
  addon: Omit<ClientAddon, "template"> & {
    config: {
      type: "postgres";
    };
  };
};

export const PostgresTabs: React.FC<Props> = ({ index }) => {
  const { register, control, watch } = useFormContext<AppTemplateFormData>();
  const { nodes } = useClusterContext();
  const { maxRamMegabytes, maxCpuCores } = useMemo(() => {
    return getServiceResourceAllowances(nodes);
  }, [nodes]);

  const [currentTab, setCurrentTab] = useState<"credentials" | "resources">(
    "credentials"
  );

  const name = watch(`addons.${index}.name`);
  const username = watch(`addons.${index}.config.username`);
  const password = watch(`addons.${index}.config.password`);

  const databaseURL = useMemo(() => {
    if (!username || !password || !name.value) {
      return "";
    }

    return `postgresql://${username}:${password}@${name.value}-postgres-hl:5432/postgres`;
  }, [username, password, name.value]);

  return (
    <>
      <TabSelector
        options={[
          { label: "Credentials", value: "credentials" },
          { label: "Resources", value: "resources" },
        ]}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      <Spacer y={1} />
      {match(currentTab)
        .with("credentials", () => (
          <>
            <Text color="helper">Postgres Username</Text>
            <Spacer y={0.25} />
            <ControlledInput
              type="text"
              placeholder="postgres"
              width="300px"
              {...register(`addons.${index}.config.username`)}
            />
            <Spacer y={1} />
            <Text color="helper">Postgres Password</Text>
            <Spacer y={0.25} />
            <ControlledInput
              type="text"
              width="300px"
              {...register(`addons.${index}.config.password`)}
            />
            <Spacer y={1} />
            {databaseURL && (
              <>
                <Text color="helper">Internal Database URL:</Text>
                <Spacer y={0.5} />
                <IdContainer>
                  <Code>{databaseURL}</Code>
                  <CopyContainer>
                    <CopyToClipboard text={databaseURL}>
                      <CopyIcon src={copy} alt="copy" />
                    </CopyToClipboard>
                  </CopyContainer>
                </IdContainer>
                <Spacer y={0.5} />
              </>
            )}
          </>
        ))
        .with("resources", () => (
          <>
            <Controller
              name={`addons.${index}.config.cpuCores`}
              control={control}
              render={({ field: { value, onChange } }) =>
                match(value)
                  .with(P.number, (v) => (
                    <IntelligentSlider
                      label="CPUs: "
                      unit="Cores"
                      min={0.01}
                      max={maxCpuCores}
                      color={"#3f51b5"}
                      value={v.toString()}
                      setValue={(e) => {
                        onChange(e);
                      }}
                      step={0.1}
                      disabled={false}
                      disabledTooltip={
                        "You may only edit this field in your porter.yaml."
                      }
                      isSmartOptimizationOn={false}
                      decimalsToRoundTo={2}
                    />
                  ))
                  .otherwise((v) => (
                    <IntelligentSlider
                      label="CPUs: "
                      unit="Cores"
                      min={0.01}
                      max={maxCpuCores}
                      color={"#3f51b5"}
                      value={v.value.toString()}
                      setValue={(e) => {
                        onChange({
                          ...v,
                          value: e,
                        });
                      }}
                      step={0.1}
                      disabled={v.readOnly}
                      disabledTooltip={
                        "You may only edit this field in your porter.yaml."
                      }
                      isSmartOptimizationOn={false}
                      decimalsToRoundTo={2}
                    />
                  ))
              }
            />
            <Spacer y={1} />
            <Controller
              name={`addons.${index}.config.ramMegabytes`}
              control={control}
              render={({ field: { value, onChange } }) =>
                match(value)
                  .with(P.number, (v) => (
                    <IntelligentSlider
                      label="RAM: "
                      unit="MB"
                      min={1}
                      max={maxRamMegabytes}
                      color={"#3f51b5"}
                      value={v.toString()}
                      setValue={(e) => {
                        onChange(e);
                      }}
                      step={10}
                      disabled={false}
                      disabledTooltip={
                        "You may only edit this field in your porter.yaml."
                      }
                      isSmartOptimizationOn={false}
                    />
                  ))
                  .otherwise((v) => (
                    <IntelligentSlider
                      label="RAM: "
                      unit="MB"
                      min={1}
                      max={maxRamMegabytes}
                      color={"#3f51b5"}
                      value={v.value.toString()}
                      setValue={(e) => {
                        onChange({
                          ...v,
                          value: e,
                        });
                      }}
                      step={10}
                      disabled={v.readOnly}
                      disabledTooltip={
                        "You may only edit this field in your porter.yaml."
                      }
                      isSmartOptimizationOn={false}
                    />
                  ))
              }
            />
          </>
        ))
        .exhaustive()}
    </>
  );
};
