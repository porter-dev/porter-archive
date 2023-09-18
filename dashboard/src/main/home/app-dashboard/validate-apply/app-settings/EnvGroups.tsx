import React, { useState } from "react";
import styled from "styled-components";
import { useLatestRevision } from "../../app-view/LatestRevisionContext";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";
import ExpandableEnvGroup from "./ExpandableEnvGroup";

const EnvGroups: React.FC = () => {
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { control } = useFormContext<PorterAppFormData>();
  const { append, remove, fields: envGroups } = useFieldArray({
    control,
    name: "app.envGroups",
  });

  const maxEnvGroupsReached = envGroups.length >= 3;

  return (
    <div>
      <TooltipWrapper
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
      >
        <LoadButton
          disabled={maxEnvGroupsReached}
          onClick={() => !maxEnvGroupsReached && setShowEnvModal(true)}
        >
          <img src={sliders} /> Load from Env Group
        </LoadButton>
        <TooltipText visible={maxEnvGroupsReached && hovered}>
          Max 4 Env Groups allowed
        </TooltipText>
      </TooltipWrapper>
      {envGroups.length > 0 && (
        <>
          <Spacer y={0.5} />
          <Text size={16}>Synced environment groups</Text>
          {envGroups.map((envGroup, index) => {
            return (
              <ExpandableEnvGroup
                key={envGroup.id}
                index={index}
                envGroup={envGroup}
                remove={remove}
              />
            );
          })}
        </>
      )}
    </div>
  );
};

export default EnvGroups;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const TooltipText = styled.span<{ visible: boolean }>`
  visibility: ${(props) => (props.visible ? "visible" : "hidden")};
  width: 240px;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  position: absolute;
  z-index: 1;
  bottom: 100%;
  left: 50%;
  margin-left: -120px;
  opacity: ${(props) => (props.visible ? "1" : "0")};
  transition: opacity 0.3s;
  font-size: 12px;
`;
