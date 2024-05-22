import React, {useContext, useMemo, useState} from "react";
import _ from "lodash";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Expandable from "components/porter/Expandable";
import Image from "components/porter/Image";
import Input from "components/porter/Input";
import PorterOperatorComponent from "components/porter/PorterOperatorComponent";
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
import {useClusterContext} from "../ClusterContextProvider";
import Modal from "../../../../components/porter/Modal";
import TrashDelete from "../../../../components/porter/TrashDelete";
import axios from "axios";

type Props = {
  availableMachineTypes: ClientMachineType[];
  isDefaultExpanded?: boolean;
  isCreating?: boolean;
};
const NodeGroups: React.FC<Props> = ({
  availableMachineTypes,
  isDefaultExpanded = true,
  isCreating = false,
}) => {
  const { control } = useFormContext<ClientClusterContract>();
  const { currentProject, currentCluster } = useContext(Context);
  const { deleteNodeGroup } = useClusterContext();
  const [ nodeGroupDeletionId, setNodeGroupDeletionId ] = useState("");
  const [ nodeGroupDeletionConfirmation, setNodeGroupDeletionConfirmation ] = useState("");
  const [ nodeGroupDeletionError, setNodeGroupDeletionError ] = useState("");
  const {
    fields: nodeGroups,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "cluster.config.nodeGroups",
  });

  const onRemove = (index: number): void => {
    const id = nodeGroups[index].nodeGroupId;

    if (id) {
      setNodeGroupDeletionId(id);
    } else {
      remove(index);
    }
  };

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

  const nodeGroupDeletionName = nodeGroups.find((ng) => ng.nodeGroupId === nodeGroupDeletionId)?.nodeGroupName || "";

  return (
    <NodeGroupContainer>
      {displayableNodeGroups.APPLICATION?.map((ng) => {
        return (
          <Expandable
            preExpanded={isDefaultExpanded}
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
                  {isCreating ? (
                    <>
                      <Spacer y={1} />
                      <PorterOperatorComponent>
                        <>
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
                      </PorterOperatorComponent>
                    </>
                  ) : (
                    <>
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
                </>
              )}
            />
          </Expandable>
        );
      })}
        {displayableNodeGroups.USER?.map((ng) => {
            return (
                <Expandable
                    preExpanded={isDefaultExpanded}
                    key={ng.nodeGroup.id}
                    header={
                        <Container row spaced={true}>
                          <Container row>
                            <Image src={world} />
                            <Spacer inline x={1} />
                            {ng.nodeGroup.nodeGroupName}
                            {ng.nodeGroup.nodeGroupId &&
                                <>
                                  <Spacer inline x={1} />
                                  <Text color={"helper"}>
                                    (id: {ng.nodeGroup.nodeGroupId})
                                  </Text>
                                </>
                            }
                          </Container>
                            <TrashDelete handleDelete={() => {
                              onRemove(ng.idx);
                            }}/>
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
                                {isCreating ? (
                                    <>
                                        <Spacer y={1} />
                                        <PorterOperatorComponent>
                                            <>
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
                                        </PorterOperatorComponent>
                                    </>
                                ) : (
                                    <>
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
                            </>
                        )}
                    />
                </Expandable>
            );
        })}
      <PorterOperatorComponent>
        <>
          {displayableNodeGroups.MONITORING?.map((ng) => {
            return (
              <Expandable
                preExpanded={isDefaultExpanded}
                key={ng.nodeGroup.id}
                header={
                  <Container row>
                    <Image src={world} />
                    <Spacer inline x={1} />
                    Monitoring node group
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
                        Minimum number of monitoring nodes
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
                        Maximum number of monitoring nodes
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
          {displayableNodeGroups.SYSTEM?.map((ng) => {
            return (
              <Expandable
                preExpanded={isDefaultExpanded}
                key={ng.nodeGroup.id}
                header={
                  <Container row>
                    <Image src={world} />
                    <Spacer inline x={1} />
                    System node group
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
                      <Text color="helper">Minimum number of system nodes</Text>
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
                      <Text color="helper">Maximum number of system nodes</Text>
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
        </>
      </PorterOperatorComponent>
      {displayableNodeGroups.CUSTOM?.map((ng) => {
        return (
          <Expandable
            preExpanded={isDefaultExpanded}
            key={ng.nodeGroup.id}
            header={
              <Container row spaced>
                <Container row>
                  <Image src={chip} />
                  <Spacer inline x={1} />
                  GPU node group
                </Container>
                {isCreating && (
                  <Container row>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(ng.idx);
                      }}
                    >
                      <span className="material-icons">delete</span>
                    </ActionButton>
                  </Container>
                )}
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
                  {isCreating ? (
                    <>
                      <Spacer y={1} />
                      <PorterOperatorComponent>
                        <>
                          <Text color="helper">
                            Minimum number of GPU nodes
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
                            Maximum number of GPU nodes
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
                      </PorterOperatorComponent>
                    </>
                  ) : (
                    <>
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
                </>
              )}
            />
          </Expandable>
        );
      })}
          <Button
            alt
            onClick={() => {
              append({
                nodeGroupType: "USER",
                nodeGroupName: "new-group",
                instanceType: availableMachineTypes
                  .map((t) => ({
                    value: t.name,
                    label: t.displayName,
                  }))[0].value,
                minInstances: 1,
                maxInstances: 10,
              });
            }}
          >
            <I className="material-icons">add</I>
            Add an additional node group
          </Button>
      {currentProject?.gpu_enabled &&
          (displayableNodeGroups.CUSTOM ?? []).length === 0 &&
          availableMachineTypes.filter((t) => t.isGPU).length > 0 && (
              <Button
                  alt
                  onClick={() => {
                    append({
                      nodeGroupType: "CUSTOM",
                      instanceType: availableMachineTypes
                          .filter((t) => t.isGPU)
                          .map((t) => ({
                            value: t.name,
                            label: t.displayName,
                          }))[0].value,
                      minInstances: 1,
                      maxInstances: 2,
                    });
                  }}
              >
                <I className="material-icons">add</I>
                Add a GPU node group
              </Button>
          )}
        { nodeGroupDeletionId && (
            <Modal
            closeModal={() => {
            setNodeGroupDeletionId("");
        }}
             >
        <Text color="helper">
            Are you sure you want to delete this node group?
        </Text>
        <Spacer y={1}/>
        <Input
            placeholder={nodeGroupDeletionName}
            value={nodeGroupDeletionConfirmation}
            setValue={setNodeGroupDeletionConfirmation}
            width="100%"
            height="40px"
        />
        <Spacer y={1}/>
        <Button
            disabled={nodeGroupDeletionConfirmation !== nodeGroupDeletionName}
            color={"red"}
            onClick={() => {
                deleteNodeGroup(nodeGroupDeletionId).catch((err) => {

                    setNodeGroupDeletionError(axios.isAxiosError(err) &&
                        err.response?.data?.error ||
                        "An error occurred while deleting your node group. Please try again.");
                });
            }}
            errorText={nodeGroupDeletionError}
        >
            Confirm deletion
        </Button>
    </Modal>
        )}
      { nodeGroupDeletionId && (
          <Modal
              closeModal={() => {
                setNodeGroupDeletionId("");
              }}
          >
            <Text color="helper">
              Are you sure you want to delete this node group?
            </Text>
            <Spacer y={1}/>
            <Input
                placeholder={nodeGroupDeletionName}
                value={nodeGroupDeletionConfirmation}
                setValue={setNodeGroupDeletionConfirmation}
                width="100%"
                height="40px"
            />
            <Spacer y={1}/>
            <Button
                disabled={nodeGroupDeletionConfirmation !== nodeGroupDeletionName}
                color={"red"}
                onClick={() => {
                  deleteNodeGroup(nodeGroupDeletionId)
                      .then(() => {
                        setNodeGroupDeletionId("");
                      })
                      .catch((err) => {

                    setNodeGroupDeletionError(axios.isAxiosError(err) && err.response?.data?.error
                        ? err.response.data.error
                        : "An error occurred while deleting your node group. Please try again.");
                  });

                }}
                errorText={nodeGroupDeletionError}
            >
              Confirm deletion
            </Button>
          </Modal>
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

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  :hover {
    color: white;
  }

  > span {
    font-size: 20px;
  }
  margin-right: 5px;
`;
