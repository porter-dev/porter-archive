import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import _ from "lodash";
import { useForm } from "react-hook-form";
import { withRouter, type RouteComponentProps } from "react-router";
import { v4 as uuidv4 } from "uuid";

import Back from "components/porter/Back";
import ClickToCopy from "components/porter/ClickToCopy";
import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Error from "components/porter/Error";
import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  dbFormValidator,
  type DatabaseTemplate,
  type DbFormData,
  type ResourceOption,
} from "lib/databases/types";

import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import Resources from "../tabs/Resources";
import DatabaseForm, {
  AppearingErrorContainer,
  Blur,
  CenterWrapper,
  DarkMatter,
  Div,
  Icon,
  RevealButton,
  StyledConfigureTemplate,
} from "./DatabaseForm";

type Props = RouteComponentProps & {
  template: DatabaseTemplate;
};

const DatabaseFormRDSPostgres: React.FC<Props> = ({ history, template }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPasswordHidden, setIsPasswordHidden] = useState<boolean>(true);

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
    formState: { errors },
    register,
    watch,
  } = dbForm;

  const watchName = watch("name", "");
  const watchTier = watch("config.instanceClass", "unspecified");

  const watchDbName = watch("config.databaseName");
  const watchDbUsername = watch("config.masterUsername");
  const watchDbPassword = watch("config.masterUserPassword");

  useEffect(() => {
    let newStep = 0;
    if (watchName) {
      newStep = 1;
    }
    if (watchTier !== "unspecified") {
      newStep = 3;
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
          <DatabaseForm
            dbName={watchName}
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
                  Specify your database CPU, RAM, and storage.
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
                  onSelect={(option: ResourceOption) => {
                    setValue("config.instanceClass", option.tier);
                    setValue(
                      "config.allocatedStorageGigabytes",
                      option.storageGigabytes
                    );
                  }}
                  highlight={"storage"}
                />
              </>,
              <>
                <Text size={16}>View database credentials</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  These credentials never leave your own cloud environment. You
                  will be able to automatically import these credentials from
                  any app.
                </Text>
                <Spacer height="20px" />
                <Fieldset>
                  <Text>Postgres DB name</Text>
                  <Spacer y={0.5} />
                  <Text
                    additionalStyles="font-family: monospace;"
                    color="helper"
                  >
                    {watchDbName}
                  </Text>
                  <Spacer y={1} />
                  <Text>Postgres username</Text>
                  <Spacer y={0.5} />
                  <Text
                    additionalStyles="font-family: monospace;"
                    color="helper"
                  >
                    {watchDbUsername}
                  </Text>
                  <Spacer y={1} />
                  <Text>Postgres password</Text>
                  <Spacer y={0.5} />
                  <Container row>
                    {isPasswordHidden ? (
                      <>
                        <Blur>{watchDbPassword}</Blur>
                        <Spacer inline width="10px" />
                        <RevealButton
                          onClick={() => {
                            setIsPasswordHidden(false);
                          }}
                        >
                          Reveal
                        </RevealButton>
                      </>
                    ) : (
                      <>
                        <ClickToCopy color="helper">
                          {watchDbPassword}
                        </ClickToCopy>
                        <Spacer inline width="10px" />
                        <RevealButton
                          onClick={() => {
                            setIsPasswordHidden(true);
                          }}
                        >
                          Hide
                        </RevealButton>
                      </>
                    )}
                  </Container>
                </Fieldset>
              </>,
            ]}
            currentStep={currentStep}
            form={dbForm}
          />
        </StyledConfigureTemplate>
      </Div>
    </CenterWrapper>
  );
};

export default withRouter(DatabaseFormRDSPostgres);
