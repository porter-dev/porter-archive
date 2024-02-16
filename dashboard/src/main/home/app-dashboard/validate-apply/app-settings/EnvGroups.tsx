import React, { useMemo, useState, useContext } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import styled from "styled-components";
import { type IterableElement } from "type-fest";
import { useHistory } from "react-router";

import { Context } from "shared/Context";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PopulatedEnvGroup } from "./types";
import { type PorterAppFormData } from "lib/porter-apps";

import { valueExists } from "shared/util";

import EnvGroupModal from "./EnvGroupModal";
import Button from "components/porter/Button";
import EnvGroupRow from "./EnvGroupRow";

type Props = {
  baseEnvGroups?: PopulatedEnvGroup[];
  attachedEnvGroups?: PopulatedEnvGroup[];
};

const EnvGroups: React.FC<Props> = ({
  baseEnvGroups = [],
  attachedEnvGroups = [],
}) => {
  const { currentProject } = useContext(Context);
  const history = useHistory();
  const [showEnvModal, setShowEnvModal] = useState(false);

  const { control } = useFormContext<PorterAppFormData>();
  const {
    append,
    remove,
    fields: envGroups,
  } = useFieldArray({
    control,
    name: "app.envGroups",
  });
  const {
    append: appendDeletion,
    remove: removeDeletion,
    fields: deletedEnvGroups,
  } = useFieldArray({
    control,
    name: "deletions.envGroupNames",
  });

  const populatedEnvWithFallback = useMemo(() => {
    return envGroups
      .map((envGroup, index) => {
        const attachedEnvGroup = attachedEnvGroups.find(
          (attachedEnvGroup) => attachedEnvGroup.name === envGroup.name
        );

        if (attachedEnvGroup) {
          return {
            id: envGroup.id,
            envGroup: attachedEnvGroup,
            index,
          };
        }

        const baseEnvGroup = baseEnvGroups.find(
          (baseEnvGroup) => baseEnvGroup.name === envGroup.name
        );

        if (baseEnvGroup) {
          return {
            id: envGroup.id,
            envGroup: baseEnvGroup,
            index,
          };
        }

        return undefined;
      })
      .filter(valueExists);
  }, [envGroups, attachedEnvGroups, baseEnvGroups]);

  const onAdd = (
    inp: IterableElement<PorterAppFormData["app"]["envGroups"]>
  ): void => {
    const previouslyDeleted = deletedEnvGroups.findIndex(
      (s) => s.name === inp.name
    );

    if (previouslyDeleted !== -1) {
      removeDeletion(previouslyDeleted);
    }

    append(inp);
  };

  const onRemove = (name: string): void => {
    const index = populatedEnvWithFallback.findIndex(eg => eg.envGroup.name === name);
    if (index !== -1) {
      remove(index);
    }
  
    const existingEnvGroupNames = envGroups.map((eg) => eg.name);
    if (existingEnvGroupNames.includes(name)) {
      appendDeletion({ name });
    }
  };

  return (
    <>
      <Text size={16}>Synced environment groups</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        This application will be automatically redeployed when a synced env group is updated.
      </Text>
      <Spacer y={1} />
      {populatedEnvWithFallback.length > 0 && (
        <>
          {populatedEnvWithFallback.map(({ envGroup, id, index }) => {
            return (
              <>
                <EnvGroupRow
                  key={id}
                  envGroup={envGroup}
                  onRemove={onRemove}
                />
                {index !== populatedEnvWithFallback.length - 1 && <Spacer y={.5} />}
              </>
            );
          })}
          <Spacer y={1} />
        </>
      )}
      {!currentProject?.sandbox_enabled ? (
        <Button
          alt
          onClick={() => {
            setShowEnvModal(true);
          }}
        >
          <I className="material-icons">add</I>
          Sync an env group
        </Button>
      ) : null }
      {showEnvModal ? (
        <EnvGroupModal
          setOpen={setShowEnvModal}
          baseEnvGroups={baseEnvGroups}
          append={onAdd}
        />
      ) : null}
    </>
  );
};

export default EnvGroups;

const I = styled.i`
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
  color: #aaaabb;
  :hover {
    color: white;
  }
`;

const AddRowButton = styled.div`
  display: flex;
  align-items: center;
  width: 270px;
  font-size: 13px;
  color: #aaaabb;
  height: 32px;
  border-radius: 3px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;
  }

  > i {
    color: #ffffff44;
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const LoadButton = styled(AddRowButton)<{ disabled?: boolean }>`
  background: ${(props) => (props.disabled ? "#aaaaaa55" : "none")};
  border: 1px solid ${(props) => (props.disabled ? "#aaaaaa55" : "#ffffff55")};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};

  > i {
    color: ${(props) => (props.disabled ? "#aaaaaa44" : "#ffffff44")};
    font-size: 16px;
    margin-left: 8px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  > img {
    width: 14px;
    margin-left: 10px;
    margin-right: 12px;
    opacity: ${(props) => (props.disabled ? "0.5" : "1")};
  }
`;
