import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import Container from "components/porter/Container";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { CloudProviderAzure } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import NodeGroups from "../../shared/NodeGroups";

const AKSClusterOverview: React.FC = () => {
  const { control, watch } = useFormContext<ClientClusterContract>();

  const region = watch("cluster.config.region");
  const cidrRange = watch("cluster.config.cidrRange");

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
      <NodeGroups
        availableMachineTypes={CloudProviderAzure.machineTypes.filter((mt) =>
          mt.supportedRegions.includes(region)
        )}
        isDefaultExpanded={false}
      />
    </>
  );
};

export default AKSClusterOverview;
