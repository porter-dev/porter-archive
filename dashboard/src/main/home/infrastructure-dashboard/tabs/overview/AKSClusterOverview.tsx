import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { CloudProviderAzure } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";
import { useMachineTypeList } from "lib/hooks/useNodeGroups";

import NodeGroups from "../../shared/NodeGroups";

const AKSClusterOverview: React.FC = () => {
  const { control, watch } = useFormContext<ClientClusterContract>();

  const cloudProviderCredentialIdentifier = watch(
    "cluster.cloudProviderCredentialsId"
  );
  const region = watch("cluster.config.region");
  const cidrRange = watch("cluster.config.cidrRange");

  const { machineTypes, isLoading } = useMachineTypeList({
    cloudProvider: "azure",
    cloudProviderCredentialIdentifier,
    region,
  });

  return (
    <>
      <Container style={{ width: "300px" }}>
        <Text size={16}>Cluster region</Text>
        <Spacer y={0.5} />
        <Select
          options={[{ value: region, label: region }]}
          disabled={true}
          value={region}
          label="📍 Azure region"
        />
        <Spacer y={1} />
      </Container>
      <Container style={{ width: "300px" }}>
        <Text size={16}>Cluster CIDR range</Text>
        <Spacer y={0.5} />
        <Select
          options={[{ value: cidrRange, label: cidrRange }]}
          disabled={true}
          value={cidrRange}
        />
        <Spacer y={1} />
      </Container>
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
      <Text size={16}>Node groups</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Configure node groups to support custom workloads.{" "}
        <a
          href="https://docs.porter.run/other/kubernetes-101"
          target="_blank"
          rel="noreferrer"
        >
          &nbsp;(?)
        </a>
      </Text>
      <Spacer y={1} />
      {isLoading || !machineTypes ? (
        <Container style={{ width: "300px" }}>
          <Loading />
        </Container>
      ) : (
        <NodeGroups
          availableMachineTypes={machineTypes}
          isDefaultExpanded={false}
        />
      )}
    </>
  );
};

export default AKSClusterOverview;
