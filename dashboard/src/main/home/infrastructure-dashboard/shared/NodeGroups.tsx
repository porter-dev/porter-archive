import React, { useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import world from "assets/world.svg";

import Image from "components/porter/Image";
import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import {
  type ClientClusterContract,
  type MachineType,
} from "lib/clusters/types";
import Expandable from "components/porter/Expandable";
import Container from "components/porter/Container";
import Text from "components/porter/Text";

type Props = {
  availableMachineTypes: MachineType[];
};
const NodeGroups: React.FC<Props> = ({ availableMachineTypes }) => {
  const { control } = useFormContext<ClientClusterContract>();
  const { fields: nodeGroups } = useFieldArray({
    control,
    name: "cluster.config.nodeGroups",
  });
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
      {displayableNodeGroups.map((ng) => {
        return ng.isIncluded ? (
          <Expandable
            preExpanded={true}
            key={ng.nodeGroup.id}
            header={
              <Container row>
                <Image src={world} />
                <Spacer inline x={1} />
                {ng.nodeGroup.nodeGroupType.charAt(0).toUpperCase()}
                {ng.nodeGroup.nodeGroupType.slice(1).toLowerCase()}
              </Container>
            }
          >
            <Controller
              name={`cluster.config.nodeGroups.${ng.idx}`}
              control={control}
              render={({ field: { value, onChange } }) => (
                <>
                  <Select
                    width="300px"
                    options={availableMachineTypes.map((t) => ({
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
                  />
                  <Spacer y={1} />
                  <Text color="helper">
                    Minimum number of application nodes
                  </Text>
                  <Spacer y={0.5} />
                  <Input
                    width="75px"
                    type="number"
                    disabled={false}
                    value={value.minInstances.toString()}
                    setValue={(newMinInstances: string) => {
                      onChange({
                        ...value,
                        minInstances: parseInt(newMinInstances),
                      });
                    }}
                    placeholder="ex: 1"
                  />
                  <Spacer y={1} />
                  <Text color="helper">
                    Maximum number of application nodes
                  </Text>
                  <Spacer y={0.5} />
                  <Input
                    width="75px"
                    type="number"
                    disabled={false}
                    value={value.maxInstances.toString()}
                    setValue={(newMaxInstances: string) => {
                      onChange({
                        ...value,
                        maxInstances: parseInt(newMaxInstances),
                      });
                    }}
                    placeholder="ex: 10"
                  />
                </>
              )}
            />
          </Expandable>
        ) : null;
      })}
    </>
  );
};

export default NodeGroups;

const NodeGroupContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 10px;
`;
