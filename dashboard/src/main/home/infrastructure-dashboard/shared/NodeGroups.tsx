import React, { useContext, useMemo } from "react";
import _ from "lodash";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Button from "components/porter/Button";
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

import { Context } from "shared/Context";
import chip from "assets/computer-chip.svg";
import world from "assets/world.svg";

type Props = {
  availableMachineTypes: ClientMachineType[];
};
const NodeGroups: React.FC<Props> = ({ availableMachineTypes }) => {
  const { control } = useFormContext<ClientClusterContract>();
  const { currentProject } = useContext(Context);
  const {
    fields: nodeGroups,
    append,
    // remove,
  } = useFieldArray({
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
              <Container row spaced>
                <Container row>
                  <Image src={chip} />
                  <Spacer inline x={1} />
                  GPU node group
                </Container>
                {/* <Container row>
                  <ActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(ng.idx);
                    }}
                  >
                    <span className="material-icons">delete</span>
                  </ActionButton>
                </Container> */}
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
      {(displayableNodeGroups.CUSTOM ?? []).length === 0 &&
        currentProject?.gpu_enabled && (
          <Button
            alt
            onClick={() => {
              append({
                nodeGroupType: "CUSTOM",
                instanceType: "g4dn.xlarge",
                minInstances: 1,
                maxInstances: 2,
              });
            }}
          >
            <I className="material-icons">add</I>
            Add a GPU node group
          </Button>
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

const I = styled.i`
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
  color: #aaaabb;
  :hover {
    color: white;
  }
`;

// const ActionButton = styled.button`
//   position: relative;
//   border: none;
//   background: none;
//   color: white;
//   padding: 5px;
//   display: flex;
//   justify-content: center;
//   align-items: center;
//   border-radius: 50%;
//   cursor: pointer;
//   color: #aaaabb;
//   :hover {
//     color: white;
//   }

//   > span {
//     font-size: 20px;
//   }
//   margin-right: 5px;
// `;
