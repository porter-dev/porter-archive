import React, { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import VerticalSteps from "components/porter/VerticalSteps";
import { CloudProviderAzure } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import NodeGroups from "../../shared/NodeGroups";
import { BackButton, Img } from "../CreateClusterForm";

type Props = {
  goBack: () => void;
};

const ConfigureAKSCluster: React.FC<Props> = ({ goBack }) => {
  const [currentStep, _setCurrentStep] = useState<number>(1);

  const { control } = useFormContext<ClientClusterContract>();

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
      <Text>Specify settings for your AKS cluster.</Text>
      <Spacer y={1} />
      <VerticalSteps
        currentStep={currentStep}
        steps={[
          <>
            <Text size={16}>Cluster region</Text>
            <Spacer y={0.5} />
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
              <Spacer y={1} />
            </Container>
          </>,
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
            <NodeGroups
              availableMachineTypes={CloudProviderAzure.machineTypes}
            />
          </>,
          <>
            <Text size={16}>Provision cluster</Text>
            <Spacer y={0.5} />
            <Button type="submit">Submit</Button>
          </>,
        ]}
      />
    </div>
  );
};

export default ConfigureAKSCluster;
