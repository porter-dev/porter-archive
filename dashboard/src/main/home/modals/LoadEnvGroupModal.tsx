import React, { Component } from "react";
import styled from "styled-components";
import close from "assets/close.png";
import sliders from "assets/sliders.svg";

import api from "shared/api";
import { Context } from "shared/Context";

import Loading from "components/Loading";
import SaveButton from "components/SaveButton";
import { KeyValue } from "components/values-form/KeyValueArray";
import { EnvGroupData } from "../cluster-dashboard/env-groups/EnvGroup";

type PropsType = {
  namespace: string;
  clusterId: number;
  closeModal: () => void;
  existingValues: Record<string, string>;
  setValues: (values: Record<string, string>) => void;
};

type StateType = {
  envGroups: any[];
  loading: boolean;
  error: boolean;
  selectedEnvGroup: EnvGroupData | null;
  buttonStatus: string;
};

export default class LoadEnvGroupModal extends Component<PropsType, StateType> {
  state = {
    envGroups: [] as any[],
    loading: true,
    error: false,
    selectedEnvGroup: null as EnvGroupData | null,
    buttonStatus: "",
  };

  onSubmit = () => {
    this.props.setValues(this.state.selectedEnvGroup.data);
    this.props.closeModal();
  };

  updateEnvGroups = () => {
    api
      .listConfigMaps(
        "<token>",
        {
          namespace: this.props.namespace,
          cluster_id: this.props.clusterId || this.context.currentCluster.id,
        },
        {
          id: this.context.currentProject.id,
        }
      )
      .then((res) => {
        this.setState({
          envGroups: res?.data?.items as any[],
          loading: false,
        });
      })
      .catch((err) => {
        this.setState({ loading: false, error: true });
      });
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
    } else if (this.state.envGroups.length === 0) {
      return (
        <Placeholder>
          No environment groups found in this namespace ({this.props.namespace}
          ).
        </Placeholder>
      );
    } else {
      return this.state.envGroups.map((envGroup: any, i: number) => {
        return (
          <EnvGroupRow
            key={i}
            isSelected={this.state.selectedEnvGroup === envGroup}
            lastItem={i === this.state.envGroups.length - 1}
            onClick={() => this.setState({ selectedEnvGroup: envGroup })}
          >
            <img src={sliders} />
            {envGroup.metadata.name}
          </EnvGroupRow>
        );
      });
    }
  };

  potentiallyOverriddenKeys(incoming: Record<string, string>): KeyValue[] {
    return Object.entries(incoming)
      .filter(([key]) => this.props.existingValues[key])
      .map(([key, value]) => ({ key, value }));
  }

  saveButtonStatus(hasClashingKeys: boolean): string {
    if (!this.state.selectedEnvGroup) {
      return "No env group selected";
    }
    if (hasClashingKeys) {
      return "There are variables defined in this group that will override existing variables.";
    }
  }

  renderEnvGroupPreview(clashingKeys: KeyValue[]) {
    const emptyValue = <i>Empty value</i>;
    return (
      <PossibleClashingKeys>
        {clashingKeys.map(({ key, value }, i) => (
          <li key={key}>
            <ClashingKeyTitle>
              <ClashIcon className="material-icons">sync_problem</ClashIcon>
              <b>{key}</b> is defined in both environments
            </ClashingKeyTitle>
            <ClashingKeyDefinitions>
              <ClashingKeyLabel>Defined as</ClashingKeyLabel>
              <ClashingKeyValue>
                {this.props.existingValues[key] || emptyValue}
              </ClashingKeyValue>
              <ClashingKeyLabel>Replaced by</ClashingKeyLabel>
              <ClashingKeyValue>{value || emptyValue}</ClashingKeyValue>
            </ClashingKeyDefinitions>
            {i !== clashingKeys.length - 1 && <ClashingKeyRowDivider />}
          </li>
        ))}
      </PossibleClashingKeys>
    );
  }

  render() {
    const clashingKeys = this.state.selectedEnvGroup
      ? this.potentiallyOverriddenKeys(this.state.selectedEnvGroup.data)
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
          <SidebarSection>
            <EnvGroupList>{this.renderEnvGroupList()}</EnvGroupList>
          </SidebarSection>

          {this.state.selectedEnvGroup ? (
            <SidebarSection>
              <GroupEnvPreview>
                {Object.entries(this.state.selectedEnvGroup.data)
                  .map(([key, value]) => `${key}=${value}`)
                  .join("\n")}
              </GroupEnvPreview>
              {clashingKeys.length > 0 && (
                <>
                  <ClashingKeyRowDivider />
                  {this.renderEnvGroupPreview(clashingKeys)}
                </>
              )}
            </SidebarSection>
          ) : (
            <i>Select an environment group.</i>
          )}
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

const SidebarSection = styled.section`
  height: 100%;
  overflow-y: auto;
`;

const GroupEnvPreview = styled.pre`
  font-family: monospace;
  margin: 0 0 10px 0;
  white-space: pre-line;
  word-break: break-word;
`;

const ClashIcon = styled.i`
  float: left;
  margin-inline-end: 4px;
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
  max-height: 160px;
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

const ClashingKeyRowDivider = styled.hr`
  margin: 16px 0;
  border: 1px solid #27292f;
`;

const ClashingKeyDefinitions = styled.div`
  grid-template-columns: min-content auto;
  column-gap: 6px;
  row-gap: 4px;
  display: grid;
`;

const ClashingKeyLabel = styled.p`
  margin: 0px;
  white-space: nowrap;
`;

const ClashingKeyValue = styled.p`
  margin: 0px;
  word-break: break-word;
`;

const EnvGroupList = styled.div`
  width: 100%;
  border-radius: 3px;
  background: #ffffff11;
  border: 1px solid #ffffff44;
  max-height: 160px;
  overflow-y: auto;
`;

const Subtitle = styled.div`
  margin-top: 15px;
  font-family: "Work Sans", sans-serif;
  font-size: 13px;
  color: #aaaabb;
`;

const ClashingKeyTitle = styled(Subtitle)`
  margin-top: 0;
  margin-bottom: 12px;
`;

const ModalTitle = styled.div`
  margin: 0px 0px 13px;
  display: flex;
  flex: 1;
  font-family: "Assistant";
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
  overflow: hidden;
  border-radius: 6px;
  background: #202227;
`;
