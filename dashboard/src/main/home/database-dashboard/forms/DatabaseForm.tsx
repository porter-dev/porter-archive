import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import _ from "lodash";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { withRouter, type RouteComponentProps } from "react-router";
import styled, { keyframes } from "styled-components";

import Button from "components/porter/Button";
import Error from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { type DbFormData } from "lib/databases/types";
import { useDatabaseList } from "lib/hooks/useDatabaseList";
import { useDatabaseMethods } from "lib/hooks/useDatabaseMethods";
import { useIntercom } from "lib/hooks/useIntercom";

type Props = RouteComponentProps & {
  dbName: string;
  steps: React.ReactNode[];
  currentStep: number;
  form: UseFormReturn<DbFormData>;
};

const DatabaseForm: React.FC<Props> = ({
  dbName,
  steps,
  currentStep,
  form,
  history,
}) => {
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string>("");
  const { create: createDatabase } = useDatabaseMethods();
  const { showIntercomWithMessage } = useIntercom();

  const {
    formState: { isSubmitting, errors },
    handleSubmit,
    setError,
    clearErrors,
  } = form;

  const { datastores: existingDatabases } = useDatabaseList();
  useEffect(() => {
    const isNameTaken = _.some(existingDatabases, (db) => {
      return db.name === dbName;
    });

    if (isNameTaken) {
      setError("name", {
        message: "A database with this name already exists",
      });
    } else if (errors.name) {
      console.log("hello world");
      clearErrors("name");
    }
  }, [dbName, JSON.stringify(existingDatabases), errors]);

  const onSubmit = handleSubmit(async (data) => {
    setSubmitErrorMessage("");
    try {
      setSubmitErrorMessage("hello world");
      // await createDatabase(data);
      // history.push(`/databases`);
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "An error occurred while creating your database. Please try again.";
      setSubmitErrorMessage(errorMessage);
      showIntercomWithMessage({
        message: "I am having trouble creating a database.",
      });
    }
  });

  const submitButtonDisabledTooltipMessage = useMemo(() => {
    console.log("errors", errors);
    if (Object.keys(errors).length > 0) {
      return "Please fix errors and resubmit.";
    }
    if (isSubmitting) {
      return "Please wait for the create to finish.";
    }
    return undefined;
  }, [errors, isSubmitting]);

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <VerticalSteps
          currentStep={currentStep}
          steps={[
            ...steps,
            <>
              <Text size={16}>Create database instance</Text>
              <Spacer y={0.5} />
              <Button
                type="submit"
                status={isSubmitting ? "loading" : ""}
                loadingText={"Creating..."}
                disabled={isSubmitting || Object.keys(errors).length > 0}
                disabledTooltipMessage={submitButtonDisabledTooltipMessage}
              >
                Create
              </Button>
              {submitErrorMessage && (
                <AppearingErrorContainer>
                  <Spacer y={0.5} />
                  <Error message={submitErrorMessage} />
                </AppearingErrorContainer>
              )}
            </>,
          ]}
        />
        <Spacer height="80px" />
      </form>
    </FormProvider>
  );
};

export default withRouter(DatabaseForm);

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
