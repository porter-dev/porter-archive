import React, { useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Container from "components/porter/Container";
import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ClientClusterContract } from "lib/clusters/types";

import { useClusterContext } from "../../ClusterContextProvider";

const GKEClusterOverview: React.FC = () => {
  const { cluster } = useClusterContext();
  const { control, watch } = useFormContext<ClientClusterContract>();
  const { fields: nodeGroups } = useFieldArray({
    control,
    name: "cluster.config.nodeGroups",
  });
  const region = watch("cluster.config.region");
  const cidrRange = watch("cluster.config.cidrRange");
  const displayableNodeGroups = useMemo(() => {
    const dng = nodeGroups.map((ng, idx) => {
      return {
        nodeGroup: ng,
        idx,
        isIncluded:
          ng.nodeGroupType === "APPLICATION" || ng.nodeGroupType === "CUSTOM",
      };
    });
    return dng;
  }, [nodeGroups]);

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
        {displayableNodeGroups.map((ng) => {
          return ng.isIncluded ? (
            <StyledForm key={ng.nodeGroup.id}>
              <Controller
                name={`cluster.config.nodeGroups.${ng.idx}`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <>
                    <Select
                      options={cluster.cloud_provider.machineTypes.map((t) => ({
                        value: t.name,
                        label: t.displayName,
                      }))}
                      value={value.instanceType}
                      setValue={(newInstanceType: string) => {
                        onChange({
                          ...value,
                          instanceType: newInstanceType,
                        });
                      }}
                      label="Machine type"
                      disabled={true} // remove this when we support zero-downtime upgrades
                    />
                    <Spacer y={1} />
                    <Input
                      width="100%"
                      type="number"
                      disabled={false}
                      value={value.maxInstances.toString()}
                      setValue={(newMaxInstances: string) => {
                        onChange({
                          ...value,
                          maxInstances: parseInt(newMaxInstances),
                        });
                      }}
                      label="Maximum number of application nodes"
                      placeholder="ex: 1"
                    />
                    <Spacer y={1} />
                    <Input
                      width="100%"
                      type="number"
                      disabled={false}
                      value={value.minInstances.toString()}
                      setValue={(newMinInstances: string) => {
                        onChange({
                          ...value,
                          minInstances: parseInt(newMinInstances),
                        });
                      }}
                      label="Minimum number of application nodes. If set to 0, no applications will be deployed."
                      placeholder="ex: 1"
                    />
                  </>
                )}
              />
            </StyledForm>
          ) : null;
        })}
      </NodeGroupContainer>
    </>
  );
};

export default GKEClusterOverview;

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
