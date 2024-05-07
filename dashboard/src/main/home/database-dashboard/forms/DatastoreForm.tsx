import React, { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import styled, { keyframes } from "styled-components";
import { match } from "ts-pattern";
import { v4 as uuidv4 } from "uuid";

import Back from "components/porter/Back";
import BlockSelect, {
  type BlockSelectOption,
} from "components/porter/BlockSelect";
import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import { Error as ErrorComponent } from "components/porter/Error";
import Selector from "components/porter/Selector";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import { isAWSCluster } from "lib/clusters/types";
import {
  type DatastoreTemplate,
  type DbFormData,
  type ResourceOption,
} from "lib/databases/types";
import { useClusterList } from "lib/hooks/useCluster";

import database from "assets/database.svg";

import {
  DATASTORE_ENGINE_POSTGRES,
  DATASTORE_ENGINE_REDIS,
  DATASTORE_TEMPLATE_AWS_AURORA,
  DATASTORE_TEMPLATE_AWS_ELASTICACHE,
  DATASTORE_TEMPLATE_AWS_RDS,
  DATASTORE_TEMPLATE_MANAGED_POSTGRES,
  DATASTORE_TEMPLATE_MANAGED_REDIS,
  DATASTORE_TEMPLATE_NEON,
  SUPPORTED_DATASTORE_TEMPLATES,
} from "../constants";
import { useDatastoreFormContext } from "../DatastoreFormContextProvider";
import ConnectionInfo from "../shared/ConnectionInfo";
import Resources from "../shared/Resources";

const DatastoreForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [template, setTemplate] = useState<DatastoreTemplate | undefined>(
    undefined
  );

  const { clusters } = useClusterList();
  // only aws clusters supported right now
  const awsClusters = useMemo(() => {
    return clusters.filter(isAWSCluster);
  }, [JSON.stringify(clusters)]);

  const {
    setValue,
    formState: { errors },
    register,
    watch,
  } = useFormContext<DbFormData>();
  const watchTier = watch("config.instanceClass", "unspecified");
  const watchDbName = watch("config.databaseName");
  const watchDbUsername = watch("config.masterUsername");
  const watchDbPassword = watch("config.masterUserPassword");
  const watchClusterId = watch("clusterId", 0);
  const watchWorkloadType = watch("workloadType", "unspecified");
  const watchEngine = watch("engine", "UNKNOWN");
  const watchInstanceClass = watch("config.instanceClass", "unspecified");
  const watchEngineVersion = watch("config.engineVersion", "");

  const { updateDatastoreButtonProps } = useDatastoreFormContext();

  const availableEngines: BlockSelectOption[] = useMemo(() => {
    return [DATASTORE_ENGINE_POSTGRES, DATASTORE_ENGINE_REDIS];
  }, [awsClusters, watchClusterId]);
  const availableWorkloadTypes: BlockSelectOption[] = useMemo(() => {
    return [
      {
        name: "Production",
        displayName: "Production",
        icon: database,
        description:
          "Managed by a cloud provider. High availability, high performance, and durability.",
        disabledOpts: !awsClusters.find((c) => c.id === watchClusterId)
          ? {
              tooltipText: "Currently only available for AWS clusters",
            }
          : undefined,
      },
      {
        name: "Test",
        displayName: "Development",
        icon: database,
        description:
          "Hosted on a cluster. Availability is not guaranteed. Only use this for small, ephemeral workloads.",
        descriptionColor: "warner",
      },
    ];
  }, [awsClusters, watchClusterId]);
  const availableHostTypes: BlockSelectOption[] = useMemo(() => {
    const options = (
      watchWorkloadType === "Production"
        ? [
            DATASTORE_TEMPLATE_AWS_RDS,
            DATASTORE_TEMPLATE_AWS_AURORA,
            DATASTORE_TEMPLATE_AWS_ELASTICACHE,
            DATASTORE_TEMPLATE_NEON,
          ]
        : [
            DATASTORE_TEMPLATE_MANAGED_POSTGRES,
            DATASTORE_TEMPLATE_MANAGED_REDIS,
          ]
    ).filter((t) => t.highLevelType.name === watchEngine);
    return options;
  }, [watchWorkloadType, watchEngine]);

  useEffect(() => {
    if (clusters.length > 0) {
      setValue("clusterId", clusters[0].id);
    }
  }, [JSON.stringify(clusters)]);

  return (
    <Div>
      <StyledConfigureTemplate>
        <Back to="/datastores" />
        <DashboardHeader
          prefix={<Icon src={database} />}
          title={"Create a new datastore"}
          capitalize={false}
          disableLineBreak
        />
        <DarkMatter />
        <VerticalSteps
          steps={[
            <>
              <Text size={16}>Datastore type</Text>
              <Spacer y={0.5} />
              <Controller
                name="engine"
                render={({ field: { value, onChange } }) => (
                  <BlockSelect
                    options={availableEngines}
                    selectedOption={availableEngines.find(
                      (e) => e.name === value
                    )}
                    setOption={(opt) => {
                      onChange(opt.name);
                      setValue("workloadType", "unspecified");
                      setTemplate(undefined);
                      setCurrentStep(1);
                    }}
                  />
                )}
              />
            </>,
            <>
              <Text size={16}>Datastore name</Text>
              {watchEngine !== "UNKNOWN" && (
                <>
                  <Spacer y={0.5} />
                  <Text color="helper">
                    Lowercase letters, numbers, and &quot;-&quot; only.
                  </Text>
                  <Spacer y={0.5} />
                  <ControlledInput
                    placeholder="ex: academic-sophon-db"
                    type="text"
                    width="300px"
                    error={errors.name?.message}
                    {...register("name")}
                    onChange={(e) => {
                      setValue("name", e.target.value);
                      setCurrentStep(Math.max(2, currentStep));
                    }}
                  />
                  {clusters.length > 1 && (
                    <>
                      <Spacer y={1} />
                      <Selector<string>
                        activeValue={watchClusterId.toString()}
                        width="300px"
                        options={clusters.map((c) => ({
                          value: c.id.toString(),
                          label: c.vanity_name,
                          key: c.id.toString(),
                        }))}
                        setActiveValue={(value: string) => {
                          setValue("clusterId", parseInt(value));
                          setValue("workloadType", "unspecified");
                          setCurrentStep(2);
                        }}
                        label={"Cluster"}
                      />
                    </>
                  )}
                </>
              )}
            </>,
            <>
              <Text size={16}>Workload type</Text>
              {currentStep >= 2 && (
                <>
                  <Spacer y={0.5} />
                  <Controller
                    name="workloadType"
                    render={({ field: { value, onChange } }) => (
                      <BlockSelect
                        options={availableWorkloadTypes}
                        selectedOption={availableWorkloadTypes.find(
                          (e) => e.name === value
                        )}
                        setOption={(opt) => {
                          onChange(opt.name);
                          setTemplate(undefined);
                          setCurrentStep(3);
                        }}
                      />
                    )}
                  />
                </>
              )}
            </>,
            <>
              <Text size={16}>Hosting option</Text>
              {watchWorkloadType !== "unspecified" && (
                <>
                  <Spacer y={0.5} />
                  <BlockSelect
                    options={availableHostTypes}
                    selectedOption={availableHostTypes.find(
                      (a) => a.name === template?.name
                    )}
                    setOption={(opt) => {
                      const templateMatch = SUPPORTED_DATASTORE_TEMPLATES.find(
                        (t) => t.name === opt.name
                      );
                      if (!templateMatch) {
                        return;
                      }
                      setTemplate(templateMatch);
                      match(templateMatch)
                        .with(
                          {
                            name: DATASTORE_TEMPLATE_AWS_ELASTICACHE.name,
                          },
                          () => {
                            setValue("config.type", "elasticache-redis");
                          }
                        )
                        .with(
                          {
                            name: DATASTORE_TEMPLATE_MANAGED_REDIS.name,
                          },
                          () => {
                            setValue("config.type", "managed-redis");
                          }
                        )
                        .with(
                          {
                            name: DATASTORE_TEMPLATE_MANAGED_POSTGRES.name,
                          },
                          () => {
                            setValue("config.type", "managed-postgres");
                            setValue("config.databaseName", "postgres");
                            setValue("config.masterUsername", "postgres");
                          }
                        )
                        .with(
                          {
                            name: DATASTORE_TEMPLATE_AWS_RDS.name,
                          },
                          () => {
                            setValue("config.type", "rds-postgres");
                            setValue("config.databaseName", "postgres");
                            setValue("config.masterUsername", "postgres");
                            setValue("config.engineVersion", "15.4");
                          }
                        )
                        .with(
                          {
                            name: DATASTORE_TEMPLATE_AWS_AURORA.name,
                          },
                          () => {
                            setValue("config.type", "rds-postgresql-aurora");
                            setValue("config.databaseName", "postgres");
                            setValue("config.masterUsername", "postgres");
                            setValue("config.engineVersion", "15.4");
                          }
                        )
                        .with(
                          {
                            name: DATASTORE_TEMPLATE_NEON.name,
                          },
                          () => {
                            setValue("config.type", "neon");
                          }
                        );
                      setValue("config.instanceClass", "unspecified");
                      setValue("config.masterUserPassword", uuidv4());
                      setCurrentStep(4);
                    }}
                  />
                  {template === DATASTORE_TEMPLATE_AWS_RDS && (
                    <>
                      <Spacer y={0.5} />
                      <Selector<string>
                        activeValue={watchEngineVersion.toString()}
                        width="300px"
                        options={DATASTORE_TEMPLATE_AWS_RDS.supportedEngineVersions.map(
                          (v) => ({
                            value: v.name,
                            label: v.displayName,
                            key: v.name,
                          })
                        )}
                        setActiveValue={(value: string) => {
                          setValue("config.engineVersion", value);
                        }}
                        label={"Postgres version"}
                      />
                    </>
                  )}
                </>
              )}
            </>,
            <>
              <Text size={16}>Specify resources</Text>
              {template && (
                <>
                  <Spacer y={0.5} />
                  <Text color="helper">
                    Specify your datastore CPU and RAM.
                  </Text>
                  {errors.config?.instanceClass?.message && (
                    <AppearingErrorContainer>
                      <Spacer y={0.5} />
                      <ErrorComponent
                        message={errors.config.instanceClass.message}
                      />
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
                      setCurrentStep(6);
                    }}
                    highlight={watchEngine === "REDIS" ? "ram" : "storage"}
                  />
                </>
              )}
            </>,
            <>
              <Text size={16}>Credentials</Text>
              {watchInstanceClass !== "unspecified" && template && (
                <>
                  <Spacer y={0.5} />
                  <Text color="helper">
                    These credentials never leave your own cloud environment.
                    Your app will use them to connect to this datastore.
                  </Text>
                  <Spacer height="20px" />
                  <ConnectionInfo
                    connectionInfo={
                      watchEngine === "REDIS"
                        ? {
                            host: "(determined after creation)",
                            port: 6379,
                            password: watchDbPassword,
                            username: "",
                            database_name: "",
                          }
                        : template === DATASTORE_TEMPLATE_NEON
                        ? {
                            host: "(determined after creation)",
                            port: 5432,
                            password: "(determined after creation)",
                            username: "(determined after creation)",
                            database_name: "(determined after creation)",
                          }
                        : {
                            host: "(determined after creation)",
                            port: 5432,
                            password: watchDbPassword,
                            username: watchDbUsername,
                            database_name: watchDbName,
                          }
                    }
                    engine={template.engine}
                  />
                </>
              )}
            </>,
            <>
              <Text size={16}>Create datastore instance</Text>
              <Spacer y={0.5} />
              <Button
                type="submit"
                status={updateDatastoreButtonProps.status}
                loadingText={updateDatastoreButtonProps.loadingText}
                disabled={updateDatastoreButtonProps.isDisabled}
              >
                Create
              </Button>
            </>,
          ]}
          currentStep={currentStep}
        />
      </StyledConfigureTemplate>
    </Div>
  );
};

export default DatastoreForm;

const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

const StyledConfigureTemplate = styled.div`
  height: 100%;
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
