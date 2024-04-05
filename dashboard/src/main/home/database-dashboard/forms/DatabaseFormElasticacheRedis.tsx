import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import _ from "lodash";
import { useForm } from "react-hook-form";
import { withRouter, type RouteComponentProps } from "react-router";
import { v4 as uuidv4 } from "uuid";

import Back from "components/porter/Back";
import Error from "components/porter/Error";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  dbFormValidator,
  type DatastoreTemplate,
  type DbFormData,
  type ResourceOption,
} from "lib/databases/types";

import DashboardHeader from "../../cluster-dashboard/DashboardHeader";
import ConnectionInfo from "../shared/ConnectionInfo";
import Resources from "../shared/Resources";
import DatabaseForm, {
  AppearingErrorContainer,
  CenterWrapper,
  DarkMatter,
  Div,
  Icon,
  StyledConfigureTemplate,
} from "./DatabaseForm";

type Props = RouteComponentProps & {
  template: DatastoreTemplate;
};

const DatabaseFormElasticacheRedis: React.FC<Props> = ({
  history,
  template,
}) => {
  const dbForm = useForm<DbFormData>({
    resolver: zodResolver(dbFormValidator),
    reValidateMode: "onSubmit",
    defaultValues: {
      config: {
        type: "elasticache-redis",
        databaseName: "postgres",
        masterUsername: "postgres",
        masterUserPassword: uuidv4(),
      },
    },
  });

  const {
    setValue,
    formState: { errors },
    watch,
  } = dbForm;

  const watchTier = watch("config.instanceClass", "unspecified");

  const watchDbPassword = watch("config.masterUserPassword");

  return (
    <CenterWrapper>
      <Div>
        <StyledConfigureTemplate>
          <Back
            onClick={() => {
              history.push(`/datastores/new`);
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
            steps={[
              <>
                <Text size={16}>Specify resources</Text>
                <Spacer y={0.5} />
                <Text color="helper">Specify your datastore CPU and RAM.</Text>
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
                  highlight={"ram"}
                />
              </>,
              <>
                <Text size={16}>Credentials</Text>
                <Spacer y={0.5} />
                <Text color="helper">
                  These credentials never leave your own cloud environment. Your
                  app will use them to connect to this datastore.
                </Text>
                <Spacer height="20px" />
                <ConnectionInfo
                  connectionInfo={{
                    host: "(determined after creation)",
                    port: 6379,
                    password: watchDbPassword,
                    username: "",
                    database_name: "",
                  }}
                  engine={template.engine}
                />
              </>,
            ]}
            currentStep={100}
            form={dbForm}
          />
        </StyledConfigureTemplate>
      </Div>
    </CenterWrapper>
  );
};

export default withRouter(DatabaseFormElasticacheRedis);
