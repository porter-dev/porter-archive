import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { Code } from "main/home/managed-addons/tabs/shared";
import { type ClientAddon } from "lib/addons";

import AddonSaveButton from "./AddonSaveButton";

const DatadogForm: React.FC = () => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ClientAddon>();
  return (
    <div>
      <Text size={16}>DataDog configuration</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        This installs the DataDog agent, which forwards all logs & metrics from
        your applications to DataDog for ingestion. It may take around 30
        minutes for the logs to arrive in your DataDog instance.
      </Text>
      <Spacer y={0.5} />
      <Text>DataDog Site</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.site")}
        placeholder="datadoghq.com"
        error={errors.config?.site?.message}
      />
      <Spacer y={0.5} />
      <Text>DataDog API Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.apiKey")}
        placeholder=""
        error={errors.config?.apiKey?.message}
      />
      <Spacer y={1} />
      <Text size={14}>Logging</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Forward logs from all containers to DataDog. Be aware that this may
        incur additional cost based on your retention settings.
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`config.loggingEnabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>Logging enabled</Text>
          </Checkbox>
        )}
      />
      <Spacer y={1} />
      <Text size={14}>DogStatsD</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Gather custom application metrics with DogStatsD. This automatically
        injects <Code>DD_AGENT_HOST</Code> as an environment variable to your
        pods to use in the code.
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`config.dogstatsdEnabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>DogStatsD enabled</Text>
          </Checkbox>
        )}
      />
      <Spacer y={1} />
      <Text size={14}>APM</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Use APM to trace your applications. This automatically injects
        environment variables to be used by standard DataDog tracing libraries.
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`config.apmEnabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>APM enabled</Text>
          </Checkbox>
        )}
      />
      <Spacer y={1} />
      <AddonSaveButton />
    </div>
  );
};

export default DatadogForm;
