import React, {
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "legacy/components/porter/Button";
import { ControlledInput } from "legacy/components/porter/ControlledInput";
import Modal from "legacy/components/porter/Modal";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { getErrorMessageFromNetworkCall } from "legacy/lib/hooks/useCluster";
import api from "legacy/shared/api";
import { useForm } from "react-hook-form";
import { useHistory } from "react-router";
import { z } from "zod";

import { Context } from "shared/Context";

const addInfisicalEnvFormData = z.object({
  vanityName: z.string(),
  envSlug: z.string(),
  envPath: z.string().default("/"),
  serviceToken: z.string(),
});
type AddInfisicalEnvFormData = z.infer<typeof addInfisicalEnvFormData>;

type AddInfisicalEnvModalProps = {
  setShowAddInfisicalEnvModal: Dispatch<SetStateAction<boolean>>;
};

export const AddInfisicalEnvModal: React.FC<AddInfisicalEnvModalProps> = ({
  setShowAddInfisicalEnvModal,
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [infisicalEnvGroupCreationError, setInfisicalEnvGroupCreationError] =
    useState<string>("");
  const history = useHistory();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AddInfisicalEnvFormData>({
    resolver: zodResolver(addInfisicalEnvFormData),
    defaultValues: {
      vanityName: "",
      envSlug: "",
      envPath: "/",
      serviceToken: "",
    },
  });

  const vanityName = register("vanityName");
  const envSlug = register("envSlug");
  const envPath = register("envPath");
  const serviceToken = register("serviceToken");

  const onSubmit = handleSubmit(async (data) => {
    try {
      setInfisicalEnvGroupCreationError("");
      if (!currentProject || !currentCluster) {
        return;
      }

      await api.createEnvironmentGroups(
        "<token>",
        {
          name: data.vanityName,
          type: "infisical",
          auth_token: data.serviceToken,
          infisical_env: {
            slug: data.envSlug,
            path: data.envPath,
          },
        },
        {
          id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      );

      history.push("/environment-groups");
    } catch (err) {
      setInfisicalEnvGroupCreationError(
        getErrorMessageFromNetworkCall(err, "Adding Infisical Env Group")
      );
    }
  });

  const submitStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }
  }, [isSubmitting]);

  return (
    <Modal
      closeModal={() => {
        setShowAddInfisicalEnvModal(false);
      }}
    >
      <form onSubmit={onSubmit}>
        <Text size={16}>Add a new Infisical service token</Text>
        <Spacer y={1} />
        <Text color="helper">
          Your Infisical secrets will be made available to Porter apps as an
          environment group.
        </Text>
        <Spacer y={1} />
        <ControlledInput
          type="text"
          placeholder="ex: my-infisical-env"
          label="Env group name (vanity name for Porter)"
          width="100%"
          height="40px"
          {...register("vanityName")}
        />
        <Spacer y={1} />
        <ControlledInput
          type="text"
          placeholder="ex: dev"
          label="Env slug"
          width="100%"
          height="40px"
          {...register("envSlug")}
        />
        <Spacer y={1} />
        <ControlledInput
          type="text"
          placeholder="ex: /"
          label="Env path"
          width="100%"
          height="40px"
          {...register("envPath")}
        />
        <Spacer y={1} />
        <ControlledInput
          type="password"
          placeholder="ex: st.123...abcdef"
          label="Infisical service token"
          width="100%"
          height="40px"
          {...register("serviceToken")}
        />
        <Spacer y={1} />
        <Button
          type="submit"
          disabled={!vanityName || !envSlug || !envPath || !serviceToken}
          status={submitStatus}
          errorText={infisicalEnvGroupCreationError}
          width="180px"
        >
          Add Infisical env group
        </Button>
      </form>
    </Modal>
  );
};
