import React, { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderGCP } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import { valueExists } from "shared/util";

import { useClusterFormContext } from "../../ClusterFormContextProvider";
import ClusterSaveButton from "../../ClusterSaveButton";
import NodeGroups from "../../shared/NodeGroups";
import { BackButton, Img } from "../CreateClusterForm";

type Props = {
  goBack: () => void;
};

const ConfigureGKECluster: React.FC<Props> = ({ goBack }) => {
  const [currentStep, _setCurrentStep] = useState<number>(100); // hack to show all steps

  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ClientClusterContract>();

  const { isMultiClusterEnabled } = useClusterFormContext();

  return (
    <div>
      <Container row>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={CloudProviderGCP.icon} />
        <Text size={16}>Configure GKE Cluster</Text>
      </Container>
      <Spacer y={1} />
      <Text>Specify settings for your GKE infrastructure.</Text>
      <Spacer y={1} />
      <VerticalSteps
        currentStep={currentStep}
        steps={[
          <>
            <Text size={16}>Cluster name</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Lowercase letters, numbers, and &quot;-&quot; only.
            </Text>
            <Spacer y={0.7} />
            <ControlledInput
              placeholder="ex: my-cluster"
              type="text"
              width="300px"
              error={errors.cluster?.config?.clusterName?.message}
              {...register("cluster.config.clusterName")}
            />
          </>,
          <>
            <Text size={16}>Region</Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Select the region where you want to run your cluster.
            </Text>
            <Spacer y={0.7} />
            <Controller
              name={`cluster.config.region`}
              control={control}
              render={({ field: { value, onChange } }) => {
                return (
                  <Container style={{ width: "300px" }}>
                    <Select
                      options={CloudProviderGCP.regions.map((region) => ({
                        value: region.name,
                        label: region.displayName,
                      }))}
                      setValue={(selected: string) => {
                        onChange(selected);
                      }}
                      value={value}
                      label="📍 GCP location"
                    />
                  </Container>
                );
              }}
            />
          </>,
          isMultiClusterEnabled ? (
            <>
              <Text size={16}>CIDR range</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Specify the VPC CIDR range for your cluster.
              </Text>
              <Spacer y={0.7} />
              <ControlledInput
                placeholder="ex: 10.78.0.0/16"
                type="text"
                width="300px"
                error={errors.cluster?.config?.cidrRange?.message}
                {...register("cluster.config.cidrRange")}
              />
              <Spacer y={0.5} />
              <Text color="helper">
                Specify the service CIDR range for your cluster.
              </Text>
              <Spacer y={0.7} />
              <ControlledInput
                placeholder="ex: 172.20.0.0/16"
                type="text"
                width="300px"
                error={errors.cluster?.config?.serviceCidrRange?.message}
                {...register("cluster.config.serviceCidrRange")}
              />
            </>
          ) : null,
          <>
            <Text size={16}>
              Application node group{" "}
              <a
                href="https://docs.porter.run/other/kubernetes-101"
                target="_blank"
                rel="noreferrer"
              >
                &nbsp;(?)
              </a>
            </Text>
            <Spacer y={0.5} />
            <Text color="helper">
              Configure your application infrastructure.{" "}
              <a
                href="https://docs.porter.run/other/kubernetes-101"
                target="_blank"
                rel="noreferrer"
              >
                &nbsp;(?)
              </a>
            </Text>
            <Spacer y={1} />
            <NodeGroups availableMachineTypes={CloudProviderGCP.machineTypes} />
          </>,
          <>
            <Text size={16}>Provision cluster</Text>
            <Spacer y={0.5} />
            <ClusterSaveButton>Submit</ClusterSaveButton>
          </>,
        ].filter(valueExists)}
      />
    </div>
  );
};

export default ConfigureGKECluster;
