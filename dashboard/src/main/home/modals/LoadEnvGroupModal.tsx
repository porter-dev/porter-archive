import React, { Component } from "react";
import styled, { css } from "styled-components";
import close from "assets/close.png";
import sliders from "assets/sliders.svg";

import api from "shared/api";
import { Context } from "shared/Context";

import Loading from "components/Loading";
import SaveButton from "components/SaveButton";
import { KeyValue } from "components/form-components/KeyValueArray";
import {
  EnvGroupData,
  formattedEnvironmentValue,
} from "../cluster-dashboard/env-groups/EnvGroup";
import CheckboxRow from "components/form-components/CheckboxRow";
import {
  PartialEnvGroup,
  PopulatedEnvGroup,
} from "components/porter-form/types";
import Helper from "components/form-components/Helper";
import DocsHelper from "components/DocsHelper";
import { isEmpty, isObject } from "lodash";

type PropsType = {
  namespace: string;
  clusterId: number;
  closeModal: () => void;
  existingValues: Record<string, string>;
  setValues: (values: Record<string, string>) => void;
  enableSyncedEnvGroups?: boolean;
  syncedEnvGroups?: PopulatedEnvGroup[];
  setSyncedEnvGroups?: (values: PopulatedEnvGroup) => void;
  normalEnvVarsOnly?: boolean;
};

type StateType = {
  envGroups: any[];
  loading: boolean;
  error: boolean;
  selectedEnvGroup: PopulatedEnvGroup | null;
  buttonStatus: string;
  shouldSync: boolean;
};

export default class LoadEnvGroupModal extends Component<PropsType, StateType> {
  state = {
    envGroups: [] as any[],
    loading: true,
    error: false,
    selectedEnvGroup: null as PopulatedEnvGroup | null,
    buttonStatus: "",
    shouldSync: false,
  };

  onSubmit = () => {
    if (
      !this.state.shouldSync ||
      this.state.selectedEnvGroup.meta_version === 1
    ) {
      this.props.setValues(this.state.selectedEnvGroup.variables);
    } else {
      this.props.setSyncedEnvGroups(this.state.selectedEnvGroup);
    }

    this.props.closeModal();
  };

  updateEnvGroups = async () => {
    let envGroups: PartialEnvGroup[] = [];
    try {
      envGroups = await api
        .listEnvGroups<PartialEnvGroup[]>(
          "<token>",
          {},
          {
            id: this.context.currentProject.id,
            namespace: this.props.namespace,
            cluster_id: this.props.clusterId || this.context.currentCluster.id,
          }
        )
        .then((res) => res.data);
    } catch (error) {
      this.setState({ loading: false, error: true });
      return;
    }

    const populateEnvGroupsPromises = envGroups.map((envGroup) =>
      api
        .getEnvGroup<PopulatedEnvGroup>(
          "<token>",
          {},
          {
            id: this.context.currentProject.id,
            cluster_id: this.context.currentCluster.id,
            name: envGroup.name,
            namespace: envGroup.namespace,
            version: envGroup.version,
          }
        )
        .then((res) => res.data)
    );

    try {
      const populatedEnvGroups = await Promise.all(populateEnvGroupsPromises);

      this.setState({
        envGroups: populatedEnvGroups,
        loading: false,
      });
    } catch (error) {
      this.setState({ loading: false, error: true });
    }
  };

  componentDidMount() {
    this.updateEnvGroups();
  }

  renderEnvGroupList = () => {
    if (this.state.loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (!this.state.envGroups?.length) {
      return (
        <Placeholder>
          No environment groups found in this namespace ({this.props.namespace}
          ).
        </Placeholder>
      );
    } else {
      return this.state.envGroups
        .filter((envGroup) => {
          if (!Array.isArray(this.props.syncedEnvGroups)) {
            return true;
          }
          return !this.props.syncedEnvGroups.find(
            (syncedEnvGroup) => syncedEnvGroup.name === envGroup.name
          );
        })
        .map((envGroup: any, i: number) => {
          return (
            <EnvGroupRow
              key={i}
              isSelected={this.state.selectedEnvGroup === envGroup}
              lastItem={i === this.state.envGroups.length - 1}
              onClick={() => this.setState({ selectedEnvGroup: envGroup })}
            >
              <img src={sliders} />
              {envGroup.name}
            </EnvGroupRow>
          );
        });
    }
  };

  potentiallyOverriddenKeys(incoming: Record<string, string>): KeyValue[] {
    if (!incoming) {
      return [];
    }

    if (
      !isObject(this.props.existingValues) ||
      isEmpty(this.props.existingValues)
    ) {
      return [];
    }

    // console.log(incoming, this.props.existingValues);
    return Object.entries(incoming)
      .filter(([key]) => this.props.existingValues[key])
      .map(([key, value]) => ({ key, value }));
  }

  saveButtonStatus(hasClashingKeys: boolean): string {
    if (!this.state.selectedEnvGroup) {
      return "No env group selected";
    }
    if (hasClashingKeys) {
      return "";
    }
  }

  renderEnvGroupPreview(clashingKeys: KeyValue[]) {
    const emptyValue = <i>Empty value</i>;
    return (
      <PossibleClashingKeys>
        {clashingKeys.map(({ key, value }, i) => (
          <ClashingKeyItem key={key}>
            <ClashingKeyTop>
              <ClashIconWrapper>
                <ClashIcon className="material-icons">sync_problem</ClashIcon>
              </ClashIconWrapper>
              <ClashingKeyExplanation>
                <b>{key}</b> is defined in both environments
              </ClashingKeyExplanation>
            </ClashingKeyTop>
            <ClashingKeyDefinitions>
              <ClashingKeyLabel>Old</ClashingKeyLabel>
              <ClashingKeyValue>
                {formattedEnvironmentValue(this.props.existingValues[key]) ||
                  emptyValue}
              </ClashingKeyValue>
              <ClashingKeyLabel>New</ClashingKeyLabel>
              <ClashingKeyValue>
                {formattedEnvironmentValue(value) || emptyValue}
              </ClashingKeyValue>
            </ClashingKeyDefinitions>
          </ClashingKeyItem>
        ))}
      </PossibleClashingKeys>
    );
  }

  render() {
    const clashingKeys = this.state.selectedEnvGroup
      ? this.potentiallyOverriddenKeys(this.state.selectedEnvGroup.variables)
      : [];
    return (
      <StyledLoadEnvGroupModal>
        <CloseButton onClick={this.props.closeModal}>
          <CloseButtonImg src={close} />
        </CloseButton>

        <ModalTitle>Load from Environment Group</ModalTitle>
        <Subtitle>
          Select an existing group of environment variables in this namespace (
          {this.props.namespace}).
        </Subtitle>

        <GroupModalSections>
          <SidebarSection $expanded={!this.state.selectedEnvGroup}>
            <EnvGroupList>{this.renderEnvGroupList()}</EnvGroupList>
          </SidebarSection>

          {this.state.selectedEnvGroup && (
            <SidebarSection>
              <GroupEnvPreview>
                {isObject(this.state.selectedEnvGroup.variables) ? (
                  <>
                    {Object.entries(this.state.selectedEnvGroup.variables || {})
                      .map(
                        ([key, value]) =>
                          `${key}=${formattedEnvironmentValue(value)}`
                      )
                      .join("\n")}
                  </>
                ) : (
                  <>This environment group has no variables</>
                )}
              </GroupEnvPreview>
              {clashingKeys?.length > 0 && (
                <>
                  <ClashingKeyRowDivider />
                  {this.renderEnvGroupPreview(clashingKeys)}
                </>
              )}
            </SidebarSection>
          )}
          <AbsoluteWrapper>
            {this.props.enableSyncedEnvGroups ? (
              <>
                {this.state.selectedEnvGroup?.meta_version === 1 ? (
                  <Helper color="#f5cb42">
                    Upgrade this env group from the env groups tab to sync.
                  </Helper>
                ) : (
                  <CheckboxRow
                    checked={this.state.shouldSync}
                    toggle={() =>
                      this.setState((prevState) => ({
                        shouldSync: !prevState.shouldSync,
                      }))
                    }
                    label="Sync environment group"
                    disabled={this.state.selectedEnvGroup?.meta_version === 1}
                  />
                )}
                <IconWrapper>
                  <DocsHelper
                    link="https://docs.porter.run/deploying-applications/environment-groups#syncing-environment-groups-to-applications"
                    tooltipText="When env group sync is enabled, the applications are automatically restarted when the env groups are updated."
                    placement="top-start"
                  />
                </IconWrapper>
              </>
            ) : !this.props.normalEnvVarsOnly ? (
              <Helper color="#f5cb42">
                Upgrade the job template to enable sync env groups
              </Helper>
            ) : null}
          </AbsoluteWrapper>
        </GroupModalSections>

        <SaveButton
          disabled={!this.state.selectedEnvGroup}
          text="Load Selected Env Group"
          status={this.saveButtonStatus(clashingKeys.length > 0)}
          onClick={this.onSubmit}
        />
      </StyledLoadEnvGroupModal>
    );
  }
}

LoadEnvGroupModal.contextType = Context;

const IconWrapper = styled.div`
  margin-bottom: -10px;
`;

const AbsoluteWrapper = styled.div`
  position: absolute;
  z-index: 999;
  bottom: 18px;
  left: 25px;
  display: flex;
  align-items: center;
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
`;

const ClashingKeyExplanation = styled.div`
  padding: 10px 15px;
`;

const ClashIconWrapper = styled.div`
  padding: 10px;
  background: #3d4048;
  display: flex;
  align-items: center;
`;

const ClashIcon = styled.i`
  font-size: 18px;
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

const LoadingWrapper = styled.div`
  height: 150px;
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

const GroupModalSections = styled.div`
  margin-top: 20px;
  width: 100%;
  height: 100%;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
  max-height: 365px;
`;

const PossibleClashingKeys = styled.ul`
  appearance: none;
  color: #aaaabb;
  margin: 0;
  padding-inline-start: 0;
  list-style: none;
  > *:not(:last-child) {
    margin-bottom: 8px;
  }
`;

const ClashingKeyItem = styled.li`
  overflow: hidden;
  border: 1px solid #292c31;
  border-radius: 5px;
`;

const ClashingKeyRowDivider = styled.hr`
  margin: 16px 0;
  border: 1px solid #27292f;
`;

const ClashingKeyDefinitions = styled.div`
  grid-template-columns: min-content auto;
  padding: 5px 0;
  column-gap: 6px;
  display: grid;
`;

const ClashingKeyLabel = styled.p`
  margin: 0px;
  font-weight: bold;
  padding: 5px 10px;
  white-space: nowrap;
`;

const ClashingKeyValue = styled.p`
  margin: 0px;
  display: flex;
  padding: 0;
  align-items: center;
  word-break: break-word;
`;

const EnvGroupList = styled.div`
  width: 100%;
  border-radius: 3px;
  background: #ffffff11;
  border: 1px solid #ffffff44;
  overflow-y: auto;
`;

const Subtitle = styled.div`
  margin-top: 15px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
`;

const ClashingKeyTop = styled.div`
  background: #2e3035;
  display: flex;
  align-items: stretch;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: Work Sans, sans-serif;
  font-size: 18px;
  color: #ffffff;
  user-select: none;
  font-weight: 700;
  align-items: center;
  position: relative;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const CloseButton = styled.div`
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  padding: 13px 0 12px 0;
  z-index: 1;
  text-align: center;
  border-radius: 50%;
  right: 15px;
  top: 12px;
  cursor: pointer;
  :hover {
    background-color: #ffffff11;
  }
`;

const CloseButtonImg = styled.img`
  width: 14px;
  margin: 0 auto;
`;

const StyledLoadEnvGroupModal = styled.div`
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 25px 30px;
  border-radius: 8px;
  background: #202227;
`;

const Flex = styled.div`
  display: flex;
`;
