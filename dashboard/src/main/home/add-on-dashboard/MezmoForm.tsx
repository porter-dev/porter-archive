import React from "react";
import { useFormContext } from "react-hook-form";

import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientAddon } from "lib/addons";

import AddonSaveButton from "./AddonSaveButton";

const MezmoForm: React.FC = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<ClientAddon>();
  return (
    <div>
      <Text size={16}>Mezmo configuration</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        This installs the Mezmo agent, which forwards all logs from Porter to
        Mezmo for ingestion. It may take around 30 minutes for the logs to
        arrive in your Mezmo instance. Be aware that this incurs additional
        costs based on your retention settings. By default, all logs are
        ingested - to reduce costs, you can filter out the logs from Mezmo.
      </Text>
      <Spacer y={0.5} />
      <Text>Ingestion Key</Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.ingestionKey")}
        placeholder="*****"
        error={errors.config?.ingestionKey?.message}
      />
      <Spacer y={1} />
      <AddonSaveButton />
    </div>
  );
};

export default MezmoForm;
