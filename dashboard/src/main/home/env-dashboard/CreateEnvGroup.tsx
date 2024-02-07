import React, { useState, useEffect, useContext, useMemo } from 'react';
import styled from 'styled-components';
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { withRouter, type RouteComponentProps } from "react-router";

import api from 'shared/api';
import { Context } from 'shared/Context';
import { type EnvGroupFormData, envGroupFormValidator } from 'lib/env-groups/types';

import envGrad from 'assets/env-group-grad.svg';

import Error from "components/porter/Error";
import Back from "components/porter/Back";
import DashboardHeader from '../cluster-dashboard/DashboardHeader';
import VerticalSteps from 'components/porter/VerticalSteps';
import Text from 'components/porter/Text';
import Spacer from 'components/porter/Spacer';
import { ControlledInput } from 'components/porter/ControlledInput';
import Button from 'components/porter/Button';
import EnvGroupArray, { type KeyValueType } from './EnvGroupArray';
import axios from 'axios';

const CreateEnvGroup: React.FC<RouteComponentProps> = ({ history }) => {
  const { currentProject, currentCluster } = useContext(Context);

  const envGroupFormMethods = useForm<EnvGroupFormData>({
    resolver: zodResolver(envGroupFormValidator),
    reValidateMode: "onSubmit",
  });

  const { 
    formState: { isValidating, isSubmitting, errors },
    register,
    watch,
    trigger,
    handleSubmit,
    setValue,
  } = envGroupFormMethods;

  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");
  const [step, setStep] = React.useState(0);
  const name = watch("name");
  const envVariables = watch("envVariables");

  useEffect(() => {
    setValue("envVariables", [
      {
        key: "",
        value: "",
        hidden: false,
        locked: false,
        deleted: false,
      }
    ])
  }, []);

  useEffect(() => {
    const validate = async (): Promise<void> => {
      const isNameValid = await trigger("name");
      const isEnvVariablesValid = await trigger("envVariables");
      if (isNameValid && isEnvVariablesValid) {
        setStep(2);
      } else if (isNameValid) {
        setStep(1);
      } else {
        setStep(0);
      }
    };
    void validate();
  }, [name, envVariables]);

  const onSubmit = handleSubmit(async (data) => {
    setSubmitErrorMessage("");
    const apiEnvVariables: Record<string, string> = {};
    const secretEnvVariables: Record<string, string> = {};
    const envVariable = data.envVariables;
    try {

      // Create env group namespace if it doesn't exist
      const res = await api.getNamespaces(
        "<token>",
        {},
        {
          id: currentProject?.id ?? -1,
          cluster_id: currentCluster?.id ?? -1,
        }
      );
      const namespaceExists = res.data.some((n: { name: string }) => n.name === "porter-env-group");
      if (!namespaceExists) {
        await api.createNamespace(
          "<token>",
          {
            name: "porter-env-group",
          },
          {
            id: currentProject?.id ?? -1,
            cluster_id: currentCluster?.id ?? -1,
          }
        );
      }

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

      await api.createEnvironmentGroups(
        "<token>",
        {
          name: data.name,
          variables: apiEnvVariables,
          secret_variables: secretEnvVariables,
        },
        {
          id: currentProject?.id ?? -1,
          cluster_id: currentCluster?.id ?? -1,
        }
      )
        
      history.push(`/envs`);
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "An error occurred while creating your env group. Please try again.";
      setSubmitErrorMessage(errorMessage);
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
    <CenterWrapper>
      <Div>
        <StyledConfigureTemplate>
          <Back to="/envs" />
          <DashboardHeader
            prefix={<Icon src={envGrad} />}
            title="Create a new env group"
            capitalize={false}
            disableLineBreak
          />
          <DarkMatter />
          <FormProvider {...envGroupFormMethods}>
            <form onSubmit={onSubmit}>
              <VerticalSteps
                currentStep={step}
                steps={[
                  <>
                    <Text size={16}>Environment group name</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Lowercase letters, numbers, and &quot;-&quot; only.
                    </Text>
                    <Spacer height="20px" />
                    <ControlledInput
                      placeholder="ex: academic-sophon-db"
                      type="text"
                      width="320px"
                      error={name?.length > 0 ? errors.name?.message : undefined}
                      {...register("name")}
                    />
                  </>,
                  <>
                    <Text size={16}>Environment variables</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Set environment-specific configuration including evironment variables and secrets.
                    </Text>
                    <Spacer height="15px" />
                    <EnvGroupArray
                      values={envVariables}
                      setValues={(x) => {
                        setValue("envVariables", x);
                      }}
                      fileUpload={true}
                      secretOption={true}
                    />
                  </>,
                  <Button
                    key={2}
                    type="submit"
                    status={submitButtonStatus}
                    loadingText="Creating env group . . ."
                    width="140px"
                  >
                    Deploy env group
                  </Button>
                ]}
              />
            </form>
          </FormProvider>
          <Spacer y={3} />
        </StyledConfigureTemplate>
      </Div>
    </CenterWrapper>
  );
}

export default withRouter(CreateEnvGroup);

const Icon = styled.img`
  margin-right: 15px;
  height: 28px;
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DarkMatter = styled.div<{ antiHeight?: string }>`
  width: 100%;
  margin-top: ${(props) => props.antiHeight || "-5px"};
`;