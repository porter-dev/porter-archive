import React, { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import styled from "styled-components";
import { match } from "ts-pattern";

import Back from "components/porter/Back";
import BlockSelect, {
  type BlockSelectOption,
} from "components/porter/BlockSelect";
import Button from "components/porter/Button";
import { ControlledInput } from "components/porter/ControlledInput";
import Selector from "components/porter/Selector";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import { type DatastoreTemplate, type DbFormData } from "lib/databases/types";
import { useClusterList } from "lib/hooks/useCluster";

import { valueExists } from "shared/util";
import database from "assets/database.svg";

import {
  DATASTORE_ENGINE_POSTGRES,
  DATASTORE_ENGINE_REDIS,
  DATASTORE_TEMPLATE_NEON,
  DATASTORE_TEMPLATE_UPSTASH,
  SUPPORTED_DATASTORE_TEMPLATES,
} from "../constants";
import { useDatastoreFormContext } from "../DatastoreFormContextProvider";

const SandboxDatastoreForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [template, setTemplate] = useState<DatastoreTemplate | undefined>(
    undefined
  );

  const { clusters } = useClusterList();

  const {
    setValue,
    formState: { errors },
    register,
    watch,
  } = useFormContext<DbFormData>();
  const watchClusterId = watch("clusterId", 0);
  const watchEngine = watch("engine", "UNKNOWN");

  const { updateDatastoreButtonProps } = useDatastoreFormContext();

  const availableEngines: BlockSelectOption[] = useMemo(() => {
    return [DATASTORE_ENGINE_POSTGRES, DATASTORE_ENGINE_REDIS];
  }, [watchClusterId]);

  const availableHostTypes: BlockSelectOption[] = useMemo(() => {
    const options = [
      DATASTORE_TEMPLATE_NEON,
      DATASTORE_TEMPLATE_UPSTASH,
    ].filter((t) => t.highLevelType.name === watchEngine);
    return options;
  }, [watchEngine]);

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
              <Text size={16}>Hosting option</Text>
              {currentStep >= 2 && (
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
                      match(templateMatch).with(
                        {
                          name: DATASTORE_TEMPLATE_NEON.name,
                        },
                        () => {
                          setValue("config.type", "neon");
                        }
                      );
                      setCurrentStep(4);
                    }}
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
          ].filter(valueExists)}
          currentStep={currentStep}
        />
      </StyledConfigureTemplate>
    </Div>
  );
};

export default SandboxDatastoreForm;

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
