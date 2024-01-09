import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import _ from "lodash";
import { FormProvider, useForm } from "react-hook-form";
import { withRouter, type RouteComponentProps } from "react-router";
import styled, { keyframes } from "styled-components";
import { v4 as uuidv4 } from "uuid";

import Back from "components/porter/Back";
import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Error from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { useDatabase } from "lib/hooks/useDatabase";
import { useIntercom } from "lib/hooks/useIntercom";

import awsRDS from "assets/amazon-rds.png";

import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import { SUPPORTED_DATABASE_TEMPLATES } from "../constants";
import Resources from "../tabs/Resources";
import {
  DATABASE_ENGINE_POSTGRES,
  DATABASE_TYPE_RDS,
  type DatabaseTemplate,
} from "../types";
import { dbFormValidator, type DbFormData } from "./types";

type Props = RouteComponentProps & {
  template: DatabaseTemplate;
};

const RDSForm: React.FC<Props> = ({ history, template }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const { createDatabase } = useDatabase();
  const { showIntercomWithMessage } = useIntercom();

  const dbForm = useForm<DbFormData>({
    resolver: zodResolver(dbFormValidator),
    reValidateMode: "onSubmit",
    defaultValues: {
      config: {
        type: "rds-postgres",
        databaseName: "postgres",
        masterUsername: "postgres",
        masterUserPassword: uuidv4(),
      },
    },
  });

  const {
    setValue,
    formState: { isSubmitting: isValidating, errors },
    handleSubmit,
    register,
    watch,
    setError,
    clearErrors,
  } = dbForm;

  const watchName = watch("name", "");
  const watchTier = watch("config.instanceClass", "unspecified");

  const onSubmit = handleSubmit(async (data) => {
    setIsCreating(true);
    clearErrors();
    try {
      await createDatabase(data);
      history.push(`/databases`);
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "An error occurred while creating your database. Please try again.";
      setError("root", { message: errorMessage });
      showIntercomWithMessage({
        message: "I am having trouble creating a database.",
      });
    } finally {
      setIsCreating(false);
    }
  });

  const submitBtnStatus = useMemo(() => {
    if (isValidating || isCreating) {
      return "loading";
    }

    if (Object.keys(errors).length) {
      return <Error message={"Please address errors and resubmit."} />;
    }

    return "";
  }, [isValidating, errors]);

  useEffect(() => {
    let newStep = 0;
    if (watchName) {
      newStep = 1;
    }
    if (watchTier !== "unspecified") {
      newStep = 2;
    }
    setCurrentStep(Math.max(newStep, currentStep));
  }, [watchName, watchTier]);

  return (
    <CenterWrapper>
      <Div>
        <StyledConfigureTemplate>
          <Back
            onClick={() => {
              history.push(`/databases/new`);
            }}
          />
          <DashboardHeader
            prefix={<Icon src={template.icon} />}
            title={template.formTitle}
            capitalize={false}
            disableLineBreak
          />
          <DarkMatter />
          <FormProvider {...dbForm}>
            <form onSubmit={onSubmit}>
              <VerticalSteps
                currentStep={currentStep}
                steps={[
                  <>
                    <Text size={16}>Specify database name</Text>
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
                  <>
                    <Text size={16}>Specify database resources</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      {template.engine.name === "redis"
                        ? "Specify your database CPU and RAM."
                        : "Specify your database CPU, RAM, and storage."}
                    </Text>
                    {errors.config?.instanceClass?.message && (
                      <AppearingErrorContainer>
                        <Spacer y={0.5} />
                        <Error message={errors.config.instanceClass.message} />
                      </AppearingErrorContainer>
                    )}
                    <Spacer y={0.5} />
                    <Text>Select an instance tier:</Text>
                    <Spacer height="20px" />
                    <Resources
                      options={template.instanceTiers}
                      selected={watchTier}
                      onSelect={(option) => {
                        setValue("config.instanceClass", option.tier);
                        setValue(
                          "config.allocatedStorageGigabytes",
                          option.storageGigabytes
                        );
                      }}
                      highlight={
                        template.engine.name === "redis" ? "ram" : "storage"
                      }
                    />
                  </>,
                  <>
                    <Text size={16}>Create database instance</Text>
                    <Spacer y={0.5} />
                    <Text color="helper">
                      Connection credentials will be available once the database
                      is created.
                    </Text>
                    <Spacer y={0.5} />
                    <Button
                      type="submit"
                      status={submitBtnStatus}
                      loadingText={"Creating..."}
                      disabled={isCreating}
                    >
                      Create
                    </Button>
                    {errors.root?.message && (
                      <AppearingErrorContainer>
                        <Spacer y={0.5} />
                        <Error message={errors.root.message} />
                      </AppearingErrorContainer>
                    )}
                  </>,
                ]}
              />
              <Spacer height="80px" />
            </form>
          </FormProvider>
        </StyledConfigureTemplate>
      </Div>
    </CenterWrapper>
  );
};

export default withRouter(RDSForm);

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

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const Icon = styled.img`
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

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

const floatIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0px);
  }
`;

const AppearingErrorContainer = styled.div`
  animation: ${floatIn} 0.5s;
  animation-fill-mode: forwards;
`;
