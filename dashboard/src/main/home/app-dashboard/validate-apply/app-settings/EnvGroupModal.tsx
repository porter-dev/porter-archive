import { PorterAppFormData } from "lib/porter-apps";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { UseFieldArrayAppend, useFormContext } from "react-hook-form";

import sliders from "assets/sliders.svg";
import doppler from "assets/doppler.png";

import { PopulatedEnvGroup } from "./types";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Modal from "components/porter/Modal";
import styled, { css } from "styled-components";
import Button from "components/porter/Button";
import { IterableElement } from "type-fest";

type Props = {
  baseEnvGroups: PopulatedEnvGroup[];
  setOpen: Dispatch<SetStateAction<boolean>>;
  append: (inp: IterableElement<PorterAppFormData["app"]["envGroups"]>) => void;
};

const EnvGroupModal: React.FC<Props> = ({ append, setOpen, baseEnvGroups }) => {
  const [
    selectedEnvGroup,
    setSelectedEnvGroup,
  ] = useState<PopulatedEnvGroup | null>(null);
  const [
    selectedDopplerEnvGroup,
    setSelectedDopplerEnvGroup
  ] = useState<string>("");

  const [dopplerEnvGroups, setDopplerEnvGroups] = useState<any[]>([]);

  // DOPPLER_TODO: call endpoint to get doppler env groups
  const loadDopplerEnvGroups = (): void => {
    setDopplerEnvGroups([
      {
        name: "doppler-env-group-1",
      },
      {
        name: "doppler-env-group-2",
      }
    ]);
  };

  useEffect(() => {
    loadDopplerEnvGroups();
  }, []);

  const { watch } = useFormContext<PorterAppFormData>();
  const envGroups = watch("app.envGroups", []);

  const onSubmit = useCallback(() => {
    if (selectedEnvGroup) {
      append({
        name: selectedEnvGroup.name,
        version: selectedEnvGroup.latest_version,
      });
      setOpen(false);
    }
  }, [selectedEnvGroup]);

  const remainingEnvGroupOptions = useMemo(() => {
    return baseEnvGroups.filter((eg) => {
      return !envGroups.some((eg2) => eg2.name === eg.name);
    });
  }, [envGroups, baseEnvGroups]);

  return (
    <Modal closeModal={() => setOpen(false)}>
      <Text size={16}>Load env group</Text>
      <Spacer height="15px" />
      <ColumnContainer>
        <ScrollableContainer>
          {remainingEnvGroupOptions.length ? (
            <>
              <Text color="helper">
                Select an Env Group to load into your application.
              </Text>
              <Spacer y={1} />
              <GroupModalSections>
                <SidebarSection $expanded={!selectedEnvGroup}>
                  <EnvGroupList>
                    {remainingEnvGroupOptions.map((eg, i) => (
                      <EnvGroupRow
                        key={eg.name}
                        isSelected={
                          Boolean(selectedEnvGroup) &&
                          selectedEnvGroup?.name === eg.name
                        }
                        lastItem={i === remainingEnvGroupOptions?.length - 1 && dopplerEnvGroups.length === 0}
                        onClick={() => {
                          setSelectedEnvGroup(eg);
                          setSelectedDopplerEnvGroup("");
                        }}
                      >
                        <img src={sliders} />
                        {eg.name}
                      </EnvGroupRow>
                    ))}
                    {dopplerEnvGroups.map((x, i) => (
                      <EnvGroupRow
                        key={i}
                        lastItem={i === dopplerEnvGroups.length - 1}
                        isSelected={x.name === selectedDopplerEnvGroup}
                        onClick={() => { 
                          setSelectedDopplerEnvGroup(x.name);
                          setSelectedEnvGroup(null);
                        }}
                      >
                        <img src={doppler} />
                        {x.name}
                      </EnvGroupRow>
                    ))}
                  </EnvGroupList>
                </SidebarSection>
                {selectedEnvGroup && (
                  <>
                    <SidebarSection>
                      <GroupEnvPreview>
                        {Object.entries(selectedEnvGroup?.variables || {}).map(
                          ([key, value]) => (
                            <div key={key}>
                              <span className="key">{key} = </span>
                              <span className="value">{value}</span>
                            </div>
                          )
                        )}
                        {Object.entries(
                          selectedEnvGroup?.secret_variables || {}
                        ).map(([key, value]) => (
                          <div key={key}>
                            <span className="key">{key} = </span>
                            <span className="value">{value}</span>
                          </div>
                        ))}
                      </GroupEnvPreview>
                    </SidebarSection>
                  </>
                )}
              </GroupModalSections>
              <Spacer y={1} />

              <Spacer y={1} />
            </>
          ) : (
            <Text>No selectable Env Groups</Text>
          )}
        </ScrollableContainer>
      </ColumnContainer>
      <Button onClick={onSubmit} disabled={!selectedEnvGroup}>
        Load env group
      </Button>
    </Modal>
  );
};

export default EnvGroupModal;

const DopplerEnvGroupList = styled.div`
`;

const EnvGroupRow = styled.div<{ lastItem?: boolean; isSelected: boolean }>`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props) => (props.lastItem ? "#00000000" : "#606166")};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#ffffff11" : "")};
  :hover {
    background: #ffffff11;
  }

  > img,
  i {
    width: 16px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    font-size: 20px;
  }
`;
const EnvGroupList = styled.div`
  width: 100%;
  border-radius: 3px;
  background: #ffffff11;
  border: 1px solid #ffffff44;
  overflow-y: auto;
`;

const SidebarSection = styled.section<{ $expanded?: boolean }>`
  height: 100%;
  overflow-y: auto;
  ${(props) =>
    props.$expanded &&
    css`
      grid-column: span 2;
    `}
`;

const GroupEnvPreview = styled.pre`
  font-family: monospace;
  margin: 0 0 10px 0;
  white-space: pre-line;
  word-break: break-word;
  user-select: text;
  .key {
    color: white;
  }
  .value {
    color: #3a48ca;
  }
`;
const GroupModalSections = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
  max-height: 365px;
`;
const ColumnContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const ScrollableContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
`;
