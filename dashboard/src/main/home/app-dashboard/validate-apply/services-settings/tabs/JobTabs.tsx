import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import TabSelector from "components/TabSelector";
import { type PorterAppFormData } from "lib/porter-apps";
import { type ClientService } from "lib/porter-apps/services";

import Advanced from "./Advanced";
import MainTab from "./Main";
import Resources from "./Resources";

type Props = {
  index: number;
  service: ClientService & {
    config: {
      type: "job" | "predeploy";
    };
  };
  maxRAM: number;
  maxCPU: number;
  clusterContainsGPUNodes: boolean;
  isPredeploy?: boolean;
};

const JobTabs: React.FC<Props> = ({
  index,
  service,
  maxRAM,
  clusterContainsGPUNodes,
  maxCPU,
  isPredeploy,
}) => {
  const { control, register } = useFormContext<PorterAppFormData>();
  const [currentTab, setCurrentTab] = React.useState<
    "main" | "resources" | "advanced"
  >("main");

  const tabs = isPredeploy
    ? [
        { label: "Main", value: "main" as const },
        { label: "Resources", value: "resources" as const },
      ]
    : [
        { label: "Main", value: "main" as const },
        { label: "Resources", value: "resources" as const },
        { label: "Advanced", value: "advanced" as const },
      ];

  return (
    <>
      <TabSelector
        options={tabs}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />
      {match(currentTab)
        .with("main", () => (
          <MainTab index={index} service={service} isPredeploy={isPredeploy} />
        ))
        .with("resources", () => (
          <Resources
            index={index}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
            clusterContainsGPUNodes={clusterContainsGPUNodes}
            service={service}
            isPredeploy={isPredeploy}
          />
        ))
        .with(
          "advanced",
          () =>
            service.config.type === "job" ? (
              <>
                <Spacer y={1} />
                <Controller
                  name={`app.services.${index}.config.allowConcurrent`}
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Checkbox
                      checked={value?.value ?? false}
                      toggleChecked={() => {
                        onChange({
                          ...value,
                          value: !value?.value,
                        });
                      }}
                      disabled={value?.readOnly}
                      disabledTooltip={
                        "You may only edit this field in your porter.yaml."
                      }
                    >
                      <Text color="helper">
                        Allow jobs to execute concurrently
                      </Text>
                    </Checkbox>
                  )}
                />
                <Spacer y={1} />
                <ControlledInput
                  type="text"
                  label="Timeout (seconds)"
                  placeholder="ex: 3600"
                  width="300px"
                  disabled={service.config.timeoutSeconds.readOnly}
                  disabledTooltip={
                    "You may only edit this field in your porter.yaml."
                  }
                  {...register(
                    `app.services.${index}.config.timeoutSeconds.value`
                  )}
                />
                <Spacer y={1} />
                <Advanced index={index} />
              </>
            ) : null // we do not display this tab for predeploy jobs anyway
        )
        .exhaustive()}
    </>
  );
};

export default JobTabs;
