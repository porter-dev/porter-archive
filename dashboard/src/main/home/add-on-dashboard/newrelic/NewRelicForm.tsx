import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import Checkbox from "components/porter/Checkbox";
import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientAddon } from "lib/addons";

import AddonSaveButton from "../AddonSaveButton";

const NewRelicForm: React.FC = () => {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<ClientAddon>();

  return (
    <div>
      <Text size={16}>NewRelic configuration</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        This installs the NewRelic agent, which forwards all logs & metrics from
        your applications to NewRelic for ingestion.
      </Text>
      <Spacer y={0.5} />
      <Text>NewRelic License Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.licenseKey")}
        placeholder="*****"
        error={errors.config?.licenseKey?.message}
      />
      <Spacer y={0.5} />
      <Text>NewRelic Insights Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.insightsKey")}
        placeholder="*****"
        error={errors.config?.insightsKey?.message}
      />
      <Spacer y={0.5} />
      <Text>NewRelic Personal API Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.personalApiKey")}
        placeholder="*****"
        error={errors.config?.personalApiKey?.message}
      />
      <Spacer y={0.5} />
      <Text>NewRelic Account ID</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.accountId")}
        placeholder="1234"
        error={errors.config?.accountId?.message}
      />
      <Spacer y={1} />
      <Text size={14}>Logging</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Enable logging and forward all logs to newRelic
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
      <Text size={14}>Kubernetes Events</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Enable forwarding of Kubernetes events to NewRelic
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`config.kubeEventsEnabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>Kubernetes events forwarding enabled</Text>
          </Checkbox>
        )}
      />
      <Spacer y={1} />
      <Text size={14}>Metrics Adapter</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Enable the metrics adapter to forward metrics to NewRelic
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`config.metricsAdapterEnabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>Metrics Adapter enabled</Text>
          </Checkbox>
        )}
      />
      <Spacer y={1} />
      <Text size={14}>Prometheus</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Enable the NewRelic prometheus collector for apps exposing Prometheus
        metrics
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`config.prometheusEnabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>Prometheus enabled</Text>
          </Checkbox>
        )}
      />
      <Spacer y={1} />
      <Text size={14}>Pixie</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Enable Pixie - an open-source observability tool for Kubernetes
        applications
      </Text>
      <Spacer y={0.5} />
      <Controller
        name={`config.pixieEnabled`}
        control={control}
        render={({ field: { value, onChange } }) => (
          <Checkbox
            checked={value}
            toggleChecked={() => {
              onChange(!value);
            }}
          >
            <Text>Pixie enabled</Text>
          </Checkbox>
        )}
      />
      <Spacer y={1} />
      <AddonSaveButton />
    </div>
  );
};

export default NewRelicForm;
