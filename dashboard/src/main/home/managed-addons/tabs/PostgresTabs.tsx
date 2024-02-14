import React, { useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import CopyToClipboard from "components/CopyToClipboard";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import TabSelector from "components/TabSelector";
import IntelligentSlider from "main/home/app-dashboard/validate-apply/services-settings/tabs/IntelligentSlider";
import { type AppTemplateFormData } from "main/home/cluster-dashboard/preview-environments/v2/setup-app/PreviewAppDataContainer";
import { type ClientAddon } from "lib/addons";

import { useClusterResources } from "shared/ClusterResourcesContext";
import copy from "assets/copy-left.svg";

import { Code, CopyContainer, CopyIcon, IdContainer } from "./shared";

type Props = {
  index: number;
  addon: ClientAddon & {
    config: {
      type: "postgres";
    };
  };
};

export const PostgresTabs: React.FC<Props> = ({ index }) => {
  const { register, control, watch } = useFormContext<AppTemplateFormData>();
  const {
    currentClusterResources: { maxCPU, maxRAM },
  } = useClusterResources();

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
              render={({ field: { value, onChange } }) => (
                <IntelligentSlider
                  label="CPUs: "
                  unit="Cores"
                  min={0.01}
                  max={maxCPU}
                  color={"#3f51b5"}
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
                  isSmartOptimizationOn={false}
                  decimalsToRoundTo={2}
                />
              )}
            />
            <Spacer y={1} />
            <Controller
              name={`addons.${index}.config.ramMegabytes`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <IntelligentSlider
                  label="RAM: "
                  unit="MB"
                  min={1}
                  max={maxRAM}
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
          </>
        ))
        .exhaustive()}
    </>
  );
};
