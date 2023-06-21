import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import EnvGroupArray from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import Text from "components/porter/Text";
import Error from "components/porter/Error";
import sliders from "assets/sliders.svg";
import EnvGroupModal from "./env-vars/EnvGroupModal";
import { PopulatedEnvGroup } from "../../../../components/porter-form/types";
import _, { isObject, differenceBy, omit } from "lodash";

interface EnvVariablesTabProps {
  envVars: any;
  setEnvVars: (x: any) => void;
  status: React.ReactNode;
  updatePorterApp: any;
  clearStatus: () => void;
  syncedEnvGroups?: PopulatedEnvGroup[];
  setSyncedEnvGroups?: (values: PopulatedEnvGroup) => void;
}

export const EnvVariablesTab: React.FC<EnvVariablesTabProps> = ({
  envVars,
  setEnvVars,
  syncedEnvGroups,
  setSyncedEnvGroups
  status,
  updatePorterApp,
  clearStatus,
}) => {

  const [showEnvModal, setShowEnvModal] = useState(false);
  useEffect(() => {
    setEnvVars(envVars);
  }, [envVars]);


  return (
    <>
      <Text size={16}>Environment variables</Text>
      <Spacer y={0.5} />
      <Text color="helper">Shared among all services.</Text>
      <EnvGroupArray
        key={envVars.length}
        values={envVars}
        setValues={(x: any) => {
          if (status !== "") {
            clearStatus();
          }
          setEnvVars(x)
        }}
        fileUpload={true}
      />
      <LoadButton
        onClick={() => setShowEnvModal(true)}
      >
        <img src={sliders} /> Load from Env Group
      </LoadButton>
      {showEnvModal && <EnvGroupModal
        setValues={(x: any) => {
          if (status !== "") {
            clearStatus();
          }
          setEnvVars(x)
        }}
        closeModal={() => setShowEnvModal(false)} />}
      {!!syncedEnvGroups?.length && (
        <>
          <Text>Synced environment groups</Text >
          {syncedEnvGroups?.map((envGroup: any) => {
            return (
              <ExpandableEnvGroup
                key={envGroup?.name}
                envGroup={envGroup}
                onDelete={() => {
                  setState((prev) => {
                    const synced = prev.synced_env_groups?.filter(
                      (env) => env.name !== envGroup.name
                    );
                    return {
                      ...prev,
                      synced_env_groups: synced,
                    };
                  });
                }}
              />
            );
          })}
        </>
      )}

      <Spacer y={0.5} />
      <Button
        onClick={() => {
          updatePorterApp();
        }}
        status={status}
        loadingText={"Updating..."}
      >
        Update app
      </Button>
      <Spacer y={0.5} />
    </>
  );
};
const ExpandableEnvGroup: React.FC<{
  envGroup: PopulatedEnvGroup;
  onDelete: () => void;
}> = ({ envGroup, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <>
      <StyledCard>
        <Flex>
          <ContentContainer>
            <EventInformation>
              <EventName>{envGroup.name}</EventName>
            </EventInformation>
          </ContentContainer>
          <ActionContainer>
            <ActionButton onClick={() => onDelete()}>
              <span className="material-icons">delete</span>
            </ActionButton>
            <ActionButton onClick={() => setIsExpanded((prev) => !prev)}>
              <i className="material-icons">
                {isExpanded ? "arrow_drop_up" : "arrow_drop_down"}
              </i>
            </ActionButton>
          </ActionContainer>
        </Flex>
        {isExpanded && (
          <>
            {isObject(envGroup.variables) ? (
              <>
                {Object.entries(envGroup.variables || {})?.map(
                  ([key, value], i: number) => {
                    // Preprocess non-string env values set via raw Helm values
                    if (typeof value === "object") {
                      value = JSON.stringify(value);
                    } else {
                      value = String(value);
                    }

                    return (
                      <InputWrapper key={i}>
                        <KeyInput
                          placeholder="ex: key"
                          width="270px"
                          value={key}
                          disabled
                        />
                        <Spacer />
                        {value?.includes("PORTERSECRET") ? (
                          <KeyInput
                            placeholder="ex: value"
                            width="270px"
                            value={value}
                            disabled
                            type={
                              value.includes("PORTERSECRET")
                                ? "password"
                                : "text"
                            }
                          />
                        ) : (
                          <MultiLineInput
                            placeholder="ex: value"
                            width="270px"
                            value={value}
                            disabled
                            rows={value?.split("\n").length}
                            spellCheck={false}
                          ></MultiLineInput>
                        )}
                      </InputWrapper>
                    );
                  }
                )}
              </>
            ) : (
              <NoVariablesTextWrapper>
                This env group has no variables yet
              </NoVariablesTextWrapper>
            )}
          </>
        )}
      </StyledCard>
    </>
  );
};

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

const LoadButton = styled(AddRowButton)`
  background: none;
  border: 1px solid #ffffff55;
  > i {
    color: #ffffff44;
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
  }
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 5px;
`;

type InputProps = {
  disabled?: boolean;
  width: string;
  borderColor?: string;
};

const KeyInput = styled.input<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid
    ${(props) => (props.borderColor ? props.borderColor : "#ffffff55")};
  border-radius: 3px;
  width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  padding: 5px 10px;
  height: 35px;
`;

export const MultiLineInput = styled.textarea<InputProps>`
  outline: none;
  border: none;
  margin-bottom: 5px;
  font-size: 13px;
  background: #ffffff11;
  border: 1px solid
    ${(props) => (props.borderColor ? props.borderColor : "#ffffff55")};
  border-radius: 3px;
  min-width: ${(props) => (props.width ? props.width : "270px")};
  max-width: ${(props) => (props.width ? props.width : "270px")};
  color: ${(props) => (props.disabled ? "#ffffff44" : "white")};
  padding: 8px 10px 5px 10px;
  min-height: 35px;
  max-height: 100px;
  white-space: nowrap;

  ::-webkit-scrollbar {
    width: 8px;
    :horizontal {
      height: 8px;
    }
  }

  ::-webkit-scrollbar-corner {
    width: 10px;
    background: #ffffff11;
    color: white;
  }

  ::-webkit-scrollbar-track {
    width: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  }

  ::-webkit-scrollbar-thumb {
    background-color: darkgrey;
    outline: 1px solid slategrey;
  }
`;

const Label = styled.div`
  color: #ffffff;
  margin-bottom: 10px;
`;

const StyledInputArray = styled.div`
  margin-bottom: 15px;
  margin-top: 22px;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StyledCard = styled.div`
  border: 1px solid #ffffff44;
  background: #ffffff11;
  margin-bottom: 5px;
  border-radius: 8px;
  margin-top: 15px;
  padding: 10px 14px;
  overflow: hidden;
  font-size: 13px;
  animation: ${fadeIn} 0.5s;
`;

const Flex = styled.div`
  display: flex;
  height: 25px;
  align-items: center;
  justify-content: space-between;
`;

const ContentContainer = styled.div`
  display: flex;
  height: 40px;
  width: 100%;
  align-items: center;
`;

const EventInformation = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
`;

const EventName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  height: 100%;
`;

const ActionButton = styled.button`
  position: relative;
  border: none;
  background: none;
  color: white;
  padding: 5px;
  width: 30px;
  height: 30px;
  margin-left: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  cursor: pointer;
  color: #aaaabb;
  border: 1px solid #ffffff00;

  :hover {
    background: #ffffff11;
    border: 1px solid #ffffff44;
  }

  > span {
    font-size: 20px;
  }
`;

const NoVariablesTextWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff99;
`;
