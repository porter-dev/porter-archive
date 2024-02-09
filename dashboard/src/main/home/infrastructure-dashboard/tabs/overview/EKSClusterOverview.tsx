import React from "react";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import { type EKSClientClusterConfig } from "lib/clusters/types";

import { useClusterContext } from "../../ClusterContextProvider";

type Props = {
  config: EKSClientClusterConfig;
};
const EKSClusterOverview: React.FC<Props> = ({ config }) => {
  const { cluster } = useClusterContext();
  return (
    <>
      <Container style={{ width: "200px" }}>
        <Select
          options={[{ value: config.region, label: config.region }]}
          disabled={true}
          value={config.region}
          label="📍 AWS region"
        />
        <Spacer y={1} />
        <Select
          options={cluster.cloud_provider.machineTypes.map((t) => ({
            value: t.name,
            label: t.displayName,
          }))}
          value={"t3.medium"}
          setValue={() => ({})}
          label="Machine type"
        />
        <Spacer y={1} />
        <Input
          width="350px"
          type="number"
          disabled={false}
          value={clusterState.maxInstances.toString()}
          setValue={() => ({})}
          label="Maximum number of application nodes"
          placeholder="ex: 1"
        />
        <Spacer y={1} />
        <Input
          width="350px"
          type="number"
          disabled={isReadOnly || isLoading}
          value={clusterState.minInstances.toString()}
          setValue={() => ({})}
          label="Minimum number of application nodes. If set to 0, no applications will be deployed."
          placeholder="ex: 1"
        />
      </Container>
      <Button
        // disabled={isDisabled()}
        disabled={false}
      >
        Provision
      </Button>
    </>
  );
};

export default EKSClusterOverview;
