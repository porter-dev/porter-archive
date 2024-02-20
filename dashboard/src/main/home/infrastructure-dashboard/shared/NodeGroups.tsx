import React, { useMemo } from "react";
import _ from "lodash";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Container from "components/porter/Container";
import Expandable from "components/porter/Expandable";
import Image from "components/porter/Image";
import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  type ClientClusterContract,
  type ClientMachineType,
} from "lib/clusters/types";

import chip from "assets/computer-chip.svg";
import world from "assets/world.svg";

type Props = {
  availableMachineTypes: ClientMachineType[];
};
const NodeGroups: React.FC<Props> = ({ availableMachineTypes }) => {
  const { control } = useFormContext<ClientClusterContract>();
  const { fields: nodeGroups, append } = useFieldArray({
    control,
    name: "cluster.config.nodeGroups",
  });
  const displayableNodeGroups = useMemo(() => {
    const dng = _.groupBy(
      nodeGroups.map((ng, idx) => {
        return {
          nodeGroup: ng,
          idx,
        };
      }),
      (ng) => ng.nodeGroup.nodeGroupType
    );
    return dng;
  }, [nodeGroups]);

  return (
    <NodeGroupContainer>
      {displayableNodeGroups.APPLICATION?.map((ng) => {
        return (
          <Expandable
            preExpanded={true}
            key={ng.nodeGroup.id}
            header={
              <Container row>
                <Image src={world} />
                <Spacer inline x={1} />
                Default node group
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
                    options={availableMachineTypes
                      .filter((t) => !t.isGPU)
                      .map((t) => ({
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
        );
      })}
      {displayableNodeGroups.CUSTOM?.map((ng) => {
        return (
          <Expandable
            preExpanded={true}
            key={ng.nodeGroup.id}
            header={
              <Container row>
                <Image src={chip} />
                <Spacer inline x={1} />
                GPU node group
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
                    options={availableMachineTypes
                      .filter((t) => t.isGPU)
                      .map((t) => ({
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
                  <Text color="helper">Minimum number of GPU nodes</Text>
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
                  <Text color="helper">Maximum number of GPU nodes</Text>
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
        );
      })}
      {(displayableNodeGroups.CUSTOM ?? []).length === 0 && (
        <AddServiceButton
          onClick={() => {
            append({
              nodeGroupType: "CUSTOM",
              instanceType: "g4dn.xlarge",
              minInstances: 1,
              maxInstances: 2,
            });
          }}
        >
          <i className="material-icons add-icon">add_icon</i>
          Add a GPU node group
        </AddServiceButton>
      )}
    </NodeGroupContainer>
  );
};

export default NodeGroups;

const NodeGroupContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AddServiceButton = styled.div`
  color: #aaaabb;
  background: ${({ theme }) => theme.fg};
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
    color: white;
  }
  display: flex;
  align-items: center;
  border-radius: 5px;
  transition: all 0.2s;
  height: 40px;
  font-size: 13px;
  width: 100%;
  padding-left: 10px;
  cursor: pointer;
  .add-icon {
    width: 30px;
    font-size: 20px;
  }
`;
