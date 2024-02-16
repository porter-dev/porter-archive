import React, { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import Container from "components/porter/Container";
import { ControlledInput } from "components/porter/ControlledInput";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderAzure } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import { valueExists } from "shared/util";

import { useClusterFormContext } from "../../ClusterFormContextProvider";
import ClusterSaveButton from "../../ClusterSaveButton";
import NodeGroups from "../../shared/NodeGroups";
import { BackButton, Img } from "../CreateClusterForm";

type Props = {
  goBack: () => void;
};

const ConfigureAKSCluster: React.FC<Props> = ({ goBack }) => {
  const [currentStep, _setCurrentStep] = useState<number>(100); // hack to show all steps

  const {
    control,
    register,
    formState: { errors },
    watch,
  } = useFormContext<ClientClusterContract>();

  const { isAdvancedSettingsEnabled } = useClusterFormContext();

  const region = watch("cluster.config.region");

  return (
    <div>
      <Container row>
        <BackButton width="140px" onClick={goBack}>
          <i className="material-icons">first_page</i>
          Select cloud
        </BackButton>
        <Spacer x={1} inline />
        <Img src={CloudProviderAzure.icon} />
        <Text size={16}>Configure AKS Cluster</Text>
      </Container>
      <Spacer y={1} />
      <Text>Specify settings for your AKS infratructure.</Text>
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
              render={({ field: { value, onChange } }) => (
                <Container style={{ width: "300px" }}>
                  <Select
                    options={CloudProviderAzure.regions.map((region) => ({
                      value: region.name,
                      label: region.displayName,
                    }))}
                    setValue={(selected: string) => {
                      onChange(selected);
                    }}
                    value={value}
                    label="📍 Azure region"
                  />
                </Container>
              )}
            />
          </>,
          <>
            <Container style={{ width: "300px" }}>
              <Text size={16}>Azure tier</Text>
              <Spacer y={0.5} />
              <Controller
                name={`cluster.config.skuTier`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Select
                    options={CloudProviderAzure.config.skuTiers.map((tier) => ({
                      value: tier.name,
                      label: tier.displayName,
                    }))}
                    value={value}
                    setValue={(newSkuTier: string) => {
                      onChange(newSkuTier);
                    }}
                  />
                )}
              />
            </Container>
          </>,
          isAdvancedSettingsEnabled ? (
            <>
              <Text size={16}>CIDR Range</Text>
              <Spacer y={0.5} />
              <Text color="helper">
                Specify the CIDR range for your cluster.
              </Text>
              <Spacer y={0.7} />
              <ControlledInput
                placeholder="ex: 10.78.0.0/16"
                type="text"
                width="300px"
                error={errors.cluster?.config?.cidrRange?.message}
                {...register("cluster.config.cidrRange")}
              />
            </>
          ) : null,
          <>
            <Text size={16}>Application node group </Text>
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
            <NodeGroups
              availableMachineTypes={CloudProviderAzure.machineTypes.filter(
                (mt) => mt.supportedRegions.includes(region)
              )}
            />
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

export default ConfigureAKSCluster;
