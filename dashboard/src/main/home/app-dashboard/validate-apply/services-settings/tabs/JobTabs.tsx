import React from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import TabSelector from "components/TabSelector";
import Checkbox from "components/porter/Checkbox";
import { Height } from "react-animate-height";

import { ClientService } from "lib/porter-apps/services";
import { match } from "ts-pattern";
import MainTab from "./Main";
import Resources from "./Resources";
import { Controller, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import { ControlledInput } from "../../../../../../components/porter/ControlledInput";

interface Props {
  index: number;
  service: ClientService & {
    config: {
      type: "job" | "predeploy";
    };
  };
  chart?: any;
  maxRAM: number;
  maxCPU: number;
  gpuNodes: boolean;
  isPredeploy?: boolean;
}

const JobTabs: React.FC<Props> = ({
  index,
  service,
  maxRAM,
  gpuNodes,
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
        .with("main", () => <MainTab index={index} service={service} isPredeploy={isPredeploy} />)
        .with("resources", () => (
          <Resources
            index={index}
            maxCPU={maxCPU}
            maxRAM={maxRAM}
            gpuNodes={gpuNodes}
            service={service}
            isPredeploy={isPredeploy}
          />
        ))
        .with("advanced", () => (
          <>
            <Spacer y={1} />
            <Controller
              name={`app.services.${index}.config.allowConcurrent`}
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
                  <Text color="helper">Allow jobs to execute concurrently</Text>
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
              {...register(`app.services.${index}.config.timeoutSeconds.value`)}
            />
          </>
        ))
        .exhaustive()}
    </>
  );
};

export default JobTabs;
