import React, { useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";

import Input from "components/porter/Input";
import Select from "components/porter/Select";
import Spacer from "components/porter/Spacer";
import {
  type ClientClusterContract,
  type MachineType,
} from "lib/clusters/types";

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
  );
};

export default NodeGroups;

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
