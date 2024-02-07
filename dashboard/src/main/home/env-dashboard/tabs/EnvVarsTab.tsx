import React, { useEffect, useState, useMemo, useContext } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import api from "shared/api";
import { Context } from "shared/Context";
import { type EnvGroupFormData, envGroupFormValidator } from "lib/env-groups/types";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import EnvGroupArray from "../EnvGroupArray";
import Button from "components/porter/Button";
import Error from "components/porter/Error";

type Props = {
  envGroup: {
    name: string;
    variables: {};
    secret_variables?: {};
    type?: string;
  };
}

const EnvVarsTab: React.FC<Props> = ({ envGroup }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [buttonStatus, setButtonStatus] = useState<string | React.ReactNode>("");

  const envGroupFormMethods = useForm<EnvGroupFormData>({
    resolver: zodResolver(envGroupFormValidator),
    reValidateMode: "onSubmit",
  });
  const { 
    formState: { isValidating, isSubmitting },
    watch,
    trigger,
    handleSubmit,
    setValue,
  } = envGroupFormMethods;

  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(false);
  const envVariables = watch("envVariables");

  useEffect(() => {
    if (buttonStatus === "success") {
      setButtonStatus("");
    }
    const validate = async (): Promise<void> => {
      const isEnvVariablesValid = await trigger("envVariables");
      if (isEnvVariablesValid) {
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    };
    void validate();
  }, [envVariables]);

  useEffect(() => {
    const normalVariables = Object.entries(
      envGroup.variables || {}
    ).map(([key, value]) => ({
      key,
      value,
      hidden: (value as string).includes("PORTERSECRET"),
      locked: (value as string).includes("PORTERSECRET"),
      deleted: false,
    }));
    const secretVariables = Object.entries(
      envGroup.secret_variables || {}
    ).map(([key, value]) => ({
      key,
      value,
      hidden: true,
      locked: true,
      deleted: false,
    }));
    const variables = [...normalVariables, ...secretVariables];
    setValue("envVariables", variables as Array<{ key: string; value: string; hidden: boolean; locked: boolean; deleted: boolean }>);
    setValue("name", envGroup.name);
  }, [envGroup]);

  const onSubmit = handleSubmit(async (data) => {
    setButtonStatus("loading");
    setSubmitErrorMessage("");
    const apiEnvVariables: Record<string, string> = {};
    const secretEnvVariables: Record<string, string> = {};
    const envVariable = data.envVariables;
    try {
      // Old env var create logic
      envVariable
        .filter((envVar: KeyValueType, index: number, self: KeyValueType[]) => {
          // remove any collisions that are marked as deleted and are duplicates
          const numCollisions = self.reduce((n, _envVar: KeyValueType) => {
            return n + (_envVar.key === envVar.key ? 1 : 0);
          }, 0);

          if (numCollisions === 1) {
            return true;
          } else {
            return (
              index ===
              self.findIndex(
                (_envVar: KeyValueType) =>
                  _envVar.key === envVar.key && !_envVar.deleted
              )
            );
          }
        })
        .forEach((envVar: KeyValueType) => {
          if (!envVar.deleted) {
            if (envVar.hidden) {
              secretEnvVariables[envVar.key] = envVar.value;
            } else {
              apiEnvVariables[envVar.key] = envVar.value;
            }
          }
        });

      if (envGroup?.type !== "doppler") {
        await api.createEnvironmentGroups(
          "<token>",
          {
            name: envGroup.name,
            variables: apiEnvVariables,
            secret_variables: secretEnvVariables,
          },
          {
            id: currentProject?.id ?? -1,
            cluster_id: currentCluster?.id ?? -1,
          }
        );
      };
     
      await api.updateAppsLinkedToEnvironmentGroup(
        "<token>",
        {
          name: envGroup?.name,
        },
        {
          id: currentProject?.id || -1,
          cluster_id: currentCluster?.id || -1,
        }
      );

      setButtonStatus("success");
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "An error occurred while creating your env group. Please try again.";
      setSubmitErrorMessage(errorMessage);
      setButtonStatus(<Error message={errorMessage} />);
    }
  });

  const submitButtonStatus = useMemo(() => {
    if (isSubmitting || isValidating) {
      return "loading";
    }
    if (submitErrorMessage) {
      return <Error message={submitErrorMessage} />;
    }
    return undefined;
  }, [isSubmitting, submitErrorMessage, isValidating]);

  return (
    <>
      <Text size={16}>Environment variables</Text>
      <Spacer y={0.5} />
      {envGroup.type === "doppler" ? (
        <Text color="helper">
          Doppler environment variables can only be updated from the Doppler dashboard.
        </Text>
      ) : (
        <Text color="helper">
          Set secret values and environment-specific configuration for your applications.
        </Text>
      )}
      <Spacer height="15px" />
      <FormProvider {...envGroupFormMethods}>
        <form onSubmit={onSubmit}>
          <EnvGroupArray
            values={envVariables}
            setValues={(x) => {
              setValue("envVariables", x);
            }}
            fileUpload={true}
            secretOption={true}
            disabled={envGroup.type === "doppler"}
          />
          {envGroup.type !== "doppler" && (
            <>
              <Spacer y={1} />
              <Button
                type="submit"
                status={buttonStatus}
                loadingText="Updating env group . . ."
                disabled={!isValid}
              >
                Update
              </Button>
            </>
          )}
        </form>
      </FormProvider>
    </>
  );
};

export default EnvVarsTab;