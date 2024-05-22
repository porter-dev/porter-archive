import React from "react";
import Container from "legacy/components/porter/Container";
import Select from "legacy/components/porter/Select";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { CloudProviderGCP } from "legacy/lib/clusters/constants";
import { type ClientClusterContract } from "legacy/lib/clusters/types";
import { useFormContext } from "react-hook-form";

import NodeGroups from "../../shared/NodeGroups";

const GKEClusterOverview: React.FC = () => {
  const { watch } = useFormContext<ClientClusterContract>();
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
          label="📍 GCP location"
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
        availableMachineTypes={CloudProviderGCP.machineTypes}
        isDefaultExpanded={false}
      />
    </>
  );
};

export default GKEClusterOverview;
