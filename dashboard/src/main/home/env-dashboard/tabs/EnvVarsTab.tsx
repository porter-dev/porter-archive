import React, { useContext, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { FormProvider, useForm } from "react-hook-form";
import styled from "styled-components";

import Button from "components/porter/Button";
import Error from "components/porter/Error";
import FileArray from "components/porter/FileArray";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  envGroupFormValidator,
  type EnvGroupFormData,
} from "lib/env-groups/types";

import api from "shared/api";
import { Context } from "shared/Context";

import EnvGroupArray, { type KeyValueType } from "../EnvGroupArray";

type Props = {
  envGroup: {
    name: string;
    variables: Record<string, string>;
    secret_variables?: Record<string, string>;
    files?: EnvGroupFormData["envFiles"];
    type?: string;
  };
  fetchEnvGroup: () => void;
};

const EnvVarsTab: React.FC<Props> = ({ envGroup, fetchEnvGroup }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [buttonStatus, setButtonStatus] = useState<string | React.ReactNode>(
    ""
  );
  const [wasCreated, setWasCreated] = useState(false);

  useEffect(() => {
    const created = new URLSearchParams(window.location.search).get("created");
    setWasCreated(created === "true");
  }, []);

  const envGroupFormMethods = useForm<EnvGroupFormData>({
    resolver: zodResolver(envGroupFormValidator),
    reValidateMode: "onSubmit",
  });
  const { watch, trigger, handleSubmit, setValue } = envGroupFormMethods;

  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(false);
  const envVariables = watch("envVariables");
  const envFiles = watch("envFiles", []);

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
    const normalVariables = Object.entries(envGroup.variables || {}).map(
      ([key, value]) => ({
        key,
        value,
        hidden: value.includes("PORTERSECRET"),
        locked: value.includes("PORTERSECRET"),
        deleted: false,
      })
    );
    const secretVariables = Object.entries(envGroup.secret_variables || {}).map(
      ([key, value]) => ({
        key,
        value,
        hidden: true,
        locked: true,
        deleted: false,
      })
    );
    const variables = [...normalVariables, ...secretVariables];
    setValue(
      "envVariables",
      variables as Array<{
        key: string;
        value: string;
        hidden: boolean;
        locked: boolean;
        deleted: boolean;
      }>
    );
    setValue("name", envGroup.name);
    setValue("envFiles", envGroup.files || []);
  }, [envGroup]);

  const isUpdatable = useMemo(() => {
    return (
      envGroup.type !== "doppler" &&
      envGroup.type !== "datastore" &&
      envGroup.type !== "infisical"
    );
  }, [envGroup.type]);

  const onSubmit = handleSubmit(async (data) => {
    setButtonStatus("loading");
    setSubmitErrorMessage("");
    const apiEnvVariables: Record<string, string> = {};
    const secretEnvVariables: Record<string, string> = {};
    const envVariables = data.envVariables;
    try {
      // Old env var create logic
      const filtered = envVariables.filter(
        (envVar: KeyValueType, index: number, self: KeyValueType[]) => {
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
        }
      );

      filtered
        .filter((envVar) => !envVar.deleted && envVar.hidden)
        .forEach((envVar) => {
          secretEnvVariables[envVar.key] = envVar.value;
        });

      filtered
        .filter((envVar) => !envVar.deleted && !envVar.hidden)
        .forEach((envVar) => {
          apiEnvVariables[envVar.key] = envVar.value;
        });

      if (envGroup?.type !== "doppler" && envGroup?.type !== "infisical") {
        await api.createEnvironmentGroups(
          "<token>",
          {
            name: envGroup.name,
            variables: apiEnvVariables,
            secret_variables: secretEnvVariables,
            files: data.envFiles,
            is_env_override: true,
          },
          {
            id: currentProject?.id ?? -1,
            cluster_id: currentCluster?.id ?? -1,
          }
        );
      }

      fetchEnvGroup();
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

  return (
    <>
      <Text size={16}>Environment variables</Text>
      <Spacer y={0.5} />
      {envGroup.type === "doppler" || envGroup.type === "infisical" ? (
        <Text color="helper">
          {envGroup.type === "doppler" ? "Doppler" : "Infisical"} environment
          variables can only be updated from the Doppler dashboard.
        </Text>
      ) : (
        <Text color="helper">
          Set secret values and environment-specific configuration for your
          applications.
        </Text>
      )}
      <Spacer height="15px" />
      <FormProvider {...envGroupFormMethods}>
        <form onSubmit={onSubmit}>
          <EnvGroupArray
            values={envVariables}
            setValues={(x) => {
              if (wasCreated) {
                setWasCreated(false);
              }
              setValue("envVariables", x);
            }}
            fileUpload={true}
            secretOption={true}
            disabled={!isUpdatable}
          />
          <Spacer y={1} />
          <Text size={16}>Environment files</Text>
          <Spacer y={0.5} />
          <Text color="helper">
            Files containing sensitive data that will be injected into your
            app&apos;s root directory, at the path{" "}
            <Code>{`/etc/secrets/${envGroup.name}`}</Code>.
          </Text>
          <Spacer y={1} />
          <FileArray
            files={envFiles}
            setFiles={(x) => {
              setValue("envFiles", x);
            }}
          />
          {isUpdatable ? (
            <>
              <Spacer y={1} />
              <Button
                type="submit"
                status={
                  wasCreated ? (
                    <StatusWrapper success={true}>
                      <i className="material-icons">done</i>
                      Successfully created
                    </StatusWrapper>
                  ) : submitErrorMessage ? (
                    "error"
                  ) : (
                    buttonStatus
                  )
                }
                errorText={submitErrorMessage}
                loadingText="Updating env group . . ."
                disabled={!isValid}
              >
                Update
              </Button>
            </>
          ) : null}
        </form>
      </FormProvider>
    </>
  );
};

export default EnvVarsTab;

const StatusWrapper = styled.div<{
  success?: boolean;
}>`
  display: flex;
  line-height: 1.5;
  align-items: center;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #ffffff55;
  margin-left: 15px;
  text-overflow: ellipsis;
  > i {
    font-size: 18px;
    margin-right: 10px;
    float: left;
    color: ${(props) => (props.success ? "#4797ff" : "#fcba03")};
  }
`;

const Code = styled.span`
  font-family: monospace;
`;
