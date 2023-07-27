import { RouteComponentProps, withRouter } from "react-router";
import styled, { css } from "styled-components";
import React, { useContext, useEffect, useState } from "react";
import Loading from "components/Loading";

import Modal from "components/porter/Modal";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import Button from "components/porter/Button";
import api from "shared/api";
import { getGithubAction } from "./utils";
import AceEditor from "react-ace";
import YamlEditor from "components/YamlEditor";
import Error from "components/porter/Error";
import Container from "components/porter/Container";
import Checkbox from "components/porter/Checkbox";
import { Context } from "../../../../../shared/Context";
import sliders from "assets/sliders.svg";
import { isEmpty, isObject } from "lodash";
import {
  EnvGroupData,
  formattedEnvironmentValue,
} from "../../../cluster-dashboard/env-groups/EnvGroup";
import {
  PartialEnvGroup,
  PopulatedEnvGroup,
  NewPopulatedEnvGroup,
} from "components/porter-form/types";
import { KeyValueType } from "../../../cluster-dashboard/env-groups/EnvGroupArray";
import { set } from "zod";

type Props = RouteComponentProps & {
  closeModal: () => void;
  availableEnvGroups?: PartialEnvGroup[];
  setValues: (x: KeyValueType[]) => void;
  values: KeyValueType[];
  syncedEnvGroups: NewPopulatedEnvGroup[];
  setSyncedEnvGroups: (values: NewPopulatedEnvGroup[]) => void;
  namespace: string;
  newApp?: boolean;
}

const EnvGroupModal: React.FC<Props> = ({
  closeModal,
  setValues,
  availableEnvGroups,
  syncedEnvGroups,
  setSyncedEnvGroups,
  values,
  namespace,
  newApp,
}) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [envGroups, setEnvGroups] = useState<any>([])
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [shouldSync, setShouldSync] = useState<boolean>(true);
  const [selectedEnvGroup, setSelectedEnvGroup] = useState<PopulatedEnvGroup | null>(null);
  const [cloneSuccess, setCloneSuccess] = useState(false);

  const updateEnvGroups = async () => {
    let populatedEnvGroups: any[] = [];
    try {
      populatedEnvGroups = await api
        .getAllEnvGroups<any[]>(
          "<token>",
          {},
          {
            id: currentProject.id,
            cluster_id: currentCluster.id,
          }
        )
        .then((res) => res.data.environment_groups);
    } catch (error) {
      setLoading(false)
      setError(true);
      return;
    }



    try {

      setEnvGroups(populatedEnvGroups)
      setLoading(false)

    } catch (error) {
      setLoading(false)
      setError(true);
    }
  };

  useEffect(() => {
    if (!values) {
      setValues([]);
    }
  }, [values]);

  useEffect(() => {
    setLoading(true)
    if (Array.isArray(availableEnvGroups)) {
      setEnvGroups(availableEnvGroups);
      setLoading(false);
      return;
    }
    updateEnvGroups();
  }, []);

  const renderEnvGroupList = () => {
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else {
      const sortedEnvGroups = envGroups.slice().sort((a, b) => a.name.localeCompare(b.name));

      return sortedEnvGroups
        .filter((envGroup) => {
          if (!Array.isArray(syncedEnvGroups)) {
            return true;
          }
          return !syncedEnvGroups.find(
            (syncedEnvGroup) => syncedEnvGroup.name === envGroup.name
          );
        })
        .map((envGroup: any, i: number) => {
          return (
            <EnvGroupRow
              key={i}
              isSelected={selectedEnvGroup === envGroup}
              lastItem={i === envGroups.length - 1}
              onClick={() => setSelectedEnvGroup(envGroup)}
            >
              <img src={sliders} />
              {envGroup.name}
            </EnvGroupRow>
          );
        });
    }
  };

  const onSubmit = () => {
    if (shouldSync) {

      syncedEnvGroups.push(selectedEnvGroup);
      setSyncedEnvGroups(syncedEnvGroups);
    }
    else {
      const _values = [...values];

      Object.entries(selectedEnvGroup?.variables || {})
        .map(
          ([key, value]) =>
            _values.push({
              key,
              value: value as string,
              hidden: false,
              locked: false,
              deleted: false,
            })
        )
      setValues(_values);
    }
    closeModal();
  };

  return (
    <Modal closeModal={closeModal}>
      <Text size={16}>
        Load env group
      </Text>
      <Spacer height="15px" />
      <ColumnContainer>

        <ScrollableContainer>
          {syncedEnvGroups.length != envGroups.length ? (<>
            <Text color="helper">
              Select an Env Group to load into your application.
            </Text>
            <Spacer y={0.5} />
            <GroupModalSections>
              <SidebarSection $expanded={!selectedEnvGroup}>
                <EnvGroupList>{renderEnvGroupList()}</EnvGroupList>
              </SidebarSection>
              {selectedEnvGroup && (
                <><SidebarSection>

                  <GroupEnvPreview>
                    {
                      isObject(selectedEnvGroup?.variables) || isObject(selectedEnvGroup?.secret_variables) ? (
                        <>
                          {[
                            ...Object.entries(selectedEnvGroup?.variables || {}).map(([key, value]) => ({
                              source: 'variables',
                              key,
                              value,
                            })),
                            ...Object.entries(selectedEnvGroup?.secret_variables || {}).map(([key, value]) => ({
                              source: 'secret_variables',
                              key,
                              value,
                            })),
                          ]
                            .map(({ key, value, source }, index) => (
                              <div key={index}>
                                <span className="key">{key} = </span>
                                <span className="value">{formattedEnvironmentValue(source === 'secret_variables' ? "****" : value)}</span>
                              </div>
                            ))}
                        </>
                      ) : (
                        <>This environment group has no variables</>
                      )
                    }
                  </GroupEnvPreview>
                </SidebarSection>

                </>
              )

              }

            </GroupModalSections>
            <Spacer y={1} />

            <Spacer y={1} />
          </>
          ) : (

            loading ? (
              < LoadingWrapper >
                < Loading />
              </LoadingWrapper>)
              : (<Text >
                No selectable Env Groups
              </Text>)

          )

          }
        </ScrollableContainer>
      </ColumnContainer>
      <SubmitButtonContainer>

        <Button
          onClick={onSubmit}
          disabled={!selectedEnvGroup}
        >
          Load Env Group
        </Button>
      </SubmitButtonContainer>


    </Modal >
  )
}

export default withRouter(EnvGroupModal);

const LoadingWrapper = styled.div`
height: 150px;
`;
const Placeholder = styled.div`
width: 100%;
height: 150px;
display: flex;
align-items: center;
justify-content: center;
color: #aaaabb;
font-size: 13px;
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
  margin-top: 20px;
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

const SubmitButtonContainer = styled.div`
  margin-top: 10px;
  text-align: right;
`;