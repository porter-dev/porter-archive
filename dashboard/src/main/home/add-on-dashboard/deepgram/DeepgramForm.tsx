import React from "react";
import { useFormContext } from "react-hook-form";

import { ControlledInput } from "components/porter/ControlledInput";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import AddonSaveButton from "main/home/add-on-dashboard/AddonSaveButton";
import { type ClientAddon } from "lib/addons";

const DeepgramForm: React.FC = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<ClientAddon>();
  return (
    <div>
      <Text size={16}> Instance type </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The instance type to run the model on. Deepgram runs only on T4 GPUs and
        we have prefilled a preferred instance type for now. Make sure the AWS
        quota is properly set.{" "}
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.instanceType")}
        placeholder="g4dn-xlarge"
        error={errors.config?.instanceType?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Release tag </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The release tag for the specific deepgram model you would like to deploy
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.releaseTag")}
        placeholder="ex: release-240426"
        error={errors.config?.releaseTag?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Deepgram API Key </Text>
      <Spacer y={0.5} />
      <Text color="helper"> The API Key provided to you by Deepgram </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.deepgramApiKey")}
        placeholder="deepgram-api-key"
        error={errors.config?.deepgramApiKey?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Quay.io Username </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The username to the container registry provided to you by Deepgram
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.quayUsername")}
        placeholder="ex: release-240426"
        error={errors.config?.quayUsername?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Quay.io secret </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The username to the container registry provided to you by Deepgram
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="password"
        width="300px"
        {...register("config.quaySecret")}
        placeholder="quay.io-secret"
        error={errors.config?.quaySecret?.message}
      />
      <Spacer y={1} />
      <Text size={16}> Quay.io email </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The username to the container registry provided to you by Deepgram
      </Text>
      <Spacer y={0.5} />
      <ControlledInput
        type="text"
        width="300px"
        {...register("config.quayEmail")}
        placeholder="x@y.com"
        error={errors.config?.quayEmail?.message}
      />
      <Spacer y={1} />
      <AddonSaveButton />
    </div>
  );
};

export default DeepgramForm;
