import React, { useMemo } from "react";
import styled from "styled-components";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type EKSClientClusterConfig } from "lib/clusters/types";

import { useClusterContext } from "../../ClusterContextProvider";

type Props = {
  config: EKSClientClusterConfig;
};
const EKSClusterOverview: React.FC<Props> = ({ config }) => {
  const { cluster } = useClusterContext();
  const displayableNodeGroups = useMemo(() => {
    return config.nodeGroups.filter(
      (ng) =>
        ng.nodeGroupType === "APPLICATION" || ng.nodeGroupType === "CUSTOM"
    );
  }, [config.nodeGroups]);

  return (
    <>
      <Container style={{ width: "300px" }}>
        <Text size={16}>Cluster region</Text>
        <Spacer y={0.5} />
        <Select
          options={[{ value: config.region, label: config.region }]}
          disabled={true}
          value={config.region}
          label="📍 AWS region"
        />
        <Spacer y={1} />
      </Container>
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
      <NodeGroupContainer>
        {displayableNodeGroups.map((ng, i) => (
          <StyledForm key={i}>
            <Select
              options={cluster.cloud_provider.machineTypes.map((t) => ({
                value: t.name,
                label: t.displayName,
              }))}
              value={ng.instanceType}
              setValue={() => ({})}
              label="Machine type"
            />
            <Spacer y={1} />
            <Input
              width="100%"
              type="number"
              disabled={false}
              value={ng.maxInstances.toString()}
              setValue={() => ({})}
              label="Maximum number of application nodes"
              placeholder="ex: 1"
            />
            <Spacer y={1} />
            <Input
              width="100%"
              type="number"
              disabled={false}
              value={ng.minInstances.toString()}
              setValue={() => ({})}
              label="Minimum number of application nodes. If set to 0, no applications will be deployed."
              placeholder="ex: 1"
            />
          </StyledForm>
        ))}
      </NodeGroupContainer>
      <Button
        // disabled={isDisabled()}
        disabled={false}
      >
        Update
      </Button>
    </>
  );
};

export default EKSClusterOverview;

const StyledForm = styled.div`
  display: flex;
  flex-direction: column;
  padding: 30px 30px 25px;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  font-size: 13px;
  margin-bottom: 30px;
  width: 300px;
`;

const NodeGroupContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 10px;
`;
