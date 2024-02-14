import React, { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import { SUPPORTED_AWS_REGIONS } from "lib/clusters/constants";

import Container from "components/porter/Container";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { CloudProviderAWS } from "lib/clusters/constants";
import { type ClientClusterContract } from "lib/clusters/types";

import NodeGroups from "../../shared/NodeGroups";

const EKSClusterOverview: React.FC = () => {
  const { watch } = useFormContext<ClientClusterContract>();
  const region = watch("cluster.config.region");

  const label = useMemo(() => {
    return SUPPORTED_AWS_REGIONS.find(x => x.name === region)?.displayName;
  }
  , [region]);

  return (
    <>
      <Container style={{ width: "300px" }}>
        <Text size={16}>AWS region</Text>
        <Spacer y={0.5} />
        <Text color="helper">Your cluster is running in the following region.</Text>
        <Spacer y={0.7} />
        <Select
          options={[{ value: region, label: label || "" }]}
          disabled={true}
          value={region}
        />
      </Container>
      <Spacer y={1} />
      <Text size={16}>
        Node groups
      </Text>
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
      <NodeGroups availableMachineTypes={CloudProviderAWS.machineTypes} />
    </>
  );
};

export default EKSClusterOverview;
