import React, {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useFormContext } from "react-hook-form";
import styled from "styled-components";
import { type IterableElement } from "type-fest";

import Button from "components/porter/Button";
import Modal from "components/porter/Modal";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type PorterAppFormData } from "lib/porter-apps";

import EnvGroupRow from "./EnvGroupRow";
import { type PopulatedEnvGroup } from "./types";

type Props = {
  baseEnvGroups: PopulatedEnvGroup[];
  setOpen: Dispatch<SetStateAction<boolean>>;
  append: (inp: IterableElement<PorterAppFormData["app"]["envGroups"]>) => void;
};

const EnvGroupModal: React.FC<Props> = ({ append, setOpen, baseEnvGroups }) => {
  const [selectedEnvGroups, setSelectedEnvGroups] = useState<
    PopulatedEnvGroup[]
  >([]);

  const { watch } = useFormContext<PorterAppFormData>();
  const envGroups = watch("app.envGroups", []);

  const onSubmit = useCallback(() => {
    selectedEnvGroups.forEach((selectedEnvGroup): void => {
      append({
        name: selectedEnvGroup.name,
        version: selectedEnvGroup.latest_version,
      });
    });
    setOpen(false);
  }, [selectedEnvGroups]);

  const remainingEnvGroupOptions = useMemo(() => {
    return baseEnvGroups
      .filter((eg) => {
        return !envGroups.some((eg2) => eg2.name === eg.name);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [envGroups, baseEnvGroups]);

  const addToSelectedEnvGroups = (envGroup: PopulatedEnvGroup): void => {
    if (isInSelectedEnvGroups(envGroup)) {
      return;
    }
    setSelectedEnvGroups([...selectedEnvGroups, envGroup]);
  };

  const removeFromSelectedEnvGroups = (envGroup: PopulatedEnvGroup): void => {
    if (isInSelectedEnvGroups(envGroup)) {
      setSelectedEnvGroups(
        selectedEnvGroups.filter((selected) => selected.name !== envGroup.name)
      );
    }
  };

  const isInSelectedEnvGroups = (envGroup: PopulatedEnvGroup): boolean => {
    return (
      selectedEnvGroups.findIndex(
        (selected) => selected.name === envGroup.name
      ) !== -1
    );
  };

  return (
    <Modal
      closeModal={() => {
        setOpen(false);
      }}
    >
      <Text size={16}>Load env group</Text>
      <Spacer height="15px" />
      {remainingEnvGroupOptions.length ? (
        <>
          <Text color="helper">
            Select an env group to sync to your application.
          </Text>
          <Spacer y={1} />
          <ScrollableContainer>
            <EnvGroupList>
              {remainingEnvGroupOptions.map((eg, i) => (
                <EnvRowWrapper key={i}>
                  <EnvGroupRow envGroup={eg} maxHeight="300px" noLink />
                  <SelectedIndicator
                    onClick={() => {
                      if (isInSelectedEnvGroups(eg)) {
                        removeFromSelectedEnvGroups(eg);
                      } else {
                        addToSelectedEnvGroups(eg);
                      }
                    }}
                    isSelected={isInSelectedEnvGroups(eg)}
                  >
                    {isInSelectedEnvGroups(eg) ? (
                      <Check className="material-icons">check</Check>
                    ) : (
                      <i className="material-icons">add</i>
                    )}
                  </SelectedIndicator>
                </EnvRowWrapper>
              ))}
            </EnvGroupList>
          </ScrollableContainer>
        </>
      ) : (
        <Text>No selectable Env Groups</Text>
      )}
      <Spacer y={1} />
      <Button onClick={onSubmit} disabled={!selectedEnvGroups}>
        Load env group
      </Button>
    </Modal>
  );
};

export default EnvGroupModal;

const Check = styled.i`
  color: #ffffff;
  background: #ffffff33;
  width: 24px;
  height: 23px;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
`;

const SelectedIndicator = styled.div<{ isSelected: boolean }>`
  position: absolute;
  top: 17px;
  right: 20px;
  width: 25px;
  height: 25px;
  border: 1px solid ${(props) => (props.isSelected ? "#ffffff" : "#ffffff55")};
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  z-index: 1;
  align-items: center;
  justify-content: center;
  :hover {
    border-color: #ffffff;
    background: #ffffff11;
  }

  > i {
    font-size: 18px;
    color: #ffffff;
  }
`;

const EnvRowWrapper = styled.div`
  transition: all 0.1s;
  position: relative;
`;

const EnvGroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ScrollableContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 480px;
`;
