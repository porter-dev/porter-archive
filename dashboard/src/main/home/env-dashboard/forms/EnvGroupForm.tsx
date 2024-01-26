import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import _ from "lodash";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { withRouter, type RouteComponentProps } from "react-router";
import styled, { keyframes } from "styled-components";

import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Error from "components/porter/Error";
import Selector from "components/porter/Selector";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { type EnvGroupFormData } from "lib/env-groups/types";
import { useEnvGroupList } from "lib/hooks/useEnvGroupList";
import { useDatastoreMethods } from "lib/hooks/useDatabaseMethods";
import { useIntercom } from "lib/hooks/useIntercom";

import { Context } from "shared/Context";

type Props = RouteComponentProps & {
  steps: React.ReactNode[];
  currentStep: number;
  form: UseFormReturn<EnvGroupFormData>;
};

const EnvGroupForm: React.FC<Props> = ({
  currentStep,
  form,
  history,
}) => {
  // const { currentProject, currentCluster } = useContext(Context);

  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");

  const {
    formState: { isSubmitting, errors, isValidating },
    handleSubmit,
    register,
  } = form;

  const { envGroups: existingEnvGroups } = useEnvGroupList();

  const onSubmit = handleSubmit(async (data) => {
    setSubmitErrorMessage("");
    if (existingEnvGroups.some((envGroup) => envGroup.name === data.name)) {
      setSubmitErrorMessage(
        "An env group with this name already exists. Please choose a different name."
      );
      return;
    }
    try {
      console.log("here's what i see", existingEnvGroups);
      history.push(`/envs/${data.name}`);
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
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <VerticalSteps
          currentStep={currentStep}
          steps={[
            <>
              <Text size={16}>Name</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Lowercase letters, numbers, and &quot;-&quot; only.
              </Text>
              <Spacer height="20px" />
              <ControlledInput
                placeholder="ex: academic-sophon-db"
                type="text"
                width="300px"
                error={errors.name?.message}
                {...register("name")}
              />
            </>,
            <Button
              key={2}
              type="submit"
              status={submitButtonStatus}
              loadingText={"Creating..."}
              disabled={isSubmitting || isValidating}
            >
              Create env group
            </Button>,
          ]}
        />
        <Spacer height="80px" />
      </form>
    </FormProvider>
  );
};

export default withRouter(EnvGroupForm);

export const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

export const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

export const Icon = styled.img`
  margin-right: 15px;
  height: 30px;
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

export const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

export const floatIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0px);
  }
`;

export const AppearingErrorContainer = styled.div`
  animation: ${floatIn} 0.5s;
  animation-fill-mode: forwards;
`;

export const RevealButton = styled.div`
  background: ${(props) => props.theme.fg};
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid #494b4f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    filter: brightness(120%);
  }
`;

export const Blur = styled.div`
  filter: blur(5px);
  -webkit-filter: blur(5px);
  position: relative;
  margin-left: -5px;
  font-family: monospace;
`;
