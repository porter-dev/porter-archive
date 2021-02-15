import React, { Component } from "react";
import styled from "styled-components";

import api from "../../shared/api";
import { ActionConfigType } from "../../shared/types";
import { Context } from "../../shared/Context";

type PropsType = {
  chartName: string | null;
  chartNamespace: string | null;
  pathIsSet: boolean;
  branch: string;
  actionConfig: ActionConfigType | null;
  setBranch: (x: string) => void;
  setActionConfig: (x: ActionConfigType) => void;
  setPath: (x: boolean) => void;
};

type StateType = {};

export default class RepoSelector extends Component<PropsType, StateType> {
  createGHAction = () => {
    let { currentProject, currentCluster } = this.context;
    let { actionConfig, chartName, chartNamespace } = this.props;

    api
      .createGHAction(
        "<token>",
        {
          git_repo: actionConfig.git_repo,
          image_repo_uri: actionConfig.image_repo_uri,
          dockerfile_path: actionConfig.dockerfile_path,
          git_repo_id: actionConfig.git_repo_id,
        },
        {
          project_id: currentProject.id,
          CLUSTER_ID: currentCluster.id,
          RELEASE_NAME: chartName,
          RELEASE_NAMESPACE: chartNamespace,
        }
      )
      .then((res) => console.log(res.data))
      .catch(console.log);
  };

  setSelectedRepo = () => {
    let { actionConfig, setActionConfig } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.git_repo = "";
    updatedConfig.git_repo_id = null as number;
    setActionConfig(updatedConfig);
  };

  goToBranchSelect = () => {
    let { actionConfig, setActionConfig, setBranch } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.dockerfile_path = "";
    setBranch("");
    setActionConfig(updatedConfig);
  };

  goToPathSelect = () => {
    let { actionConfig, setActionConfig, setPath } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.image_repo_uri = "";
    updatedConfig.dockerfile_path = updatedConfig.dockerfile_path.slice(0, -11);
    setPath(false);
    setActionConfig(updatedConfig);
  };

  renderExpanded = () => {
    let { actionConfig, pathIsSet, branch } = this.props;

    if (!actionConfig.git_repo) {
      return <></>;
    } else if (!branch) {
      return (
        <ButtonTray>
          <BackButton width="130px" onClick={() => this.setSelectedRepo()}>
            <i className="material-icons">keyboard_backspace</i>
            Select Repo
          </BackButton>
        </ButtonTray>
      );
    } else if (!pathIsSet) {
      return (
        <ButtonTray>
          <BackButton onClick={() => this.goToBranchSelect()} width="140px">
            <i className="material-icons">keyboard_backspace</i>
            Select Branch
          </BackButton>
        </ButtonTray>
      );
    }
    return (
      <ButtonTray>
        <BackButton width="130px" onClick={() => this.goToPathSelect()}>
          <i className="material-icons">keyboard_backspace</i>
          Select Dockerfile
        </BackButton>
        <BackButton
          disabled={
            !actionConfig.git_repo ||
            !actionConfig.dockerfile_path ||
            !actionConfig.image_repo_uri
          }
          width="146px"
          onClick={() => this.createGHAction()}
        >
          <i className="material-icons">local_shipping</i>
          Create Github Action
        </BackButton>
      </ButtonTray>
    );
  };

  render() {
    return <>{this.renderExpanded()}</>;
  }
}

RepoSelector.contextType = Context;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  cursor: pointer;
  font-size: 13px;
  padding: 5px 10px;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { width: string; disabled?: boolean }) => props.width};
  color: ${(props: { width: string; disabled?: boolean }) =>
    props.disabled ? "#ffffff55" : "white"};
  pointer-events: ${(props: { width: string; disabled?: boolean }) =>
    props.disabled ? "none" : "auto"};

  :hover {
    background: #ffffff11;
  }

  > i {
    color: ${(props: { width: string; disabled?: boolean }) =>
      props.disabled ? "#ffffff55" : "white"};
    font-size: 18px;
    margin-right: 10px;
  }
`;

const ButtonTray = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;
