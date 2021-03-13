import React, { Component } from "react";
import styled from "styled-components";

import { ActionConfigType } from "shared/types";
import { Context } from "shared/Context";

import RepoList from "./RepoList";
import BranchList from "./BranchList";
import ContentsList from "./ContentsList";
import ActionDetails from "./ActionDetails";

type PropsType = {
  actionConfig: ActionConfigType | null;
  branch: string;
  setActionConfig: (x: ActionConfigType) => void;
  setBranch: (x: string) => void;
  reset: any;
  dockerfilePath: string;
  setDockerfilePath: (x: string) => void;
  folderPath: string;
  setFolderPath: (x: string) => void;
  setSelectedRegistry: (x: any) => void;
  selectedRegistry: any;
};

type StateType = {
  loading: boolean;
  error: boolean;
};

const defaultActionConfig: ActionConfigType = {
  git_repo: "",
  image_repo_uri: "",
  git_repo_id: 0,
};

export default class ActionConfEditor extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
  };

  renderExpanded = () => {
    let { actionConfig, branch, setActionConfig, setBranch } = this.props;

    if (!actionConfig.git_repo) {
      return (
        <ExpandedWrapper>
          <RepoList
            actionConfig={actionConfig}
            setActionConfig={(x: ActionConfigType) => setActionConfig(x)}
            readOnly={false}
          />
        </ExpandedWrapper>
      );
    } else if (!this.props.dockerfilePath && !this.props.folderPath) {
      /* else if (!branch) {
      return (
        <>
          <ExpandedWrapperAlt>
            <BranchList
              actionConfig={actionConfig}
              setBranch={(branch: string) => setBranch(branch)}
            />
          </ExpandedWrapperAlt>
          <Br />
          <BackButton width="135px" onClick={() => setActionConfig({ ...defaultActionConfig })}>
            <i className="material-icons">keyboard_backspace</i>
            Select Repo
          </BackButton>
        </>
      );
    } */
      return (
        <>
          <ExpandedWrapperAlt>
            <ContentsList
              actionConfig={actionConfig}
              branch={branch}
              setActionConfig={setActionConfig}
              setDockerfilePath={(x: string) => this.props.setDockerfilePath(x)}
              setFolderPath={(x: string) => this.props.setFolderPath(x)}
            />
          </ExpandedWrapperAlt>
          <Br />
          <BackButton
            width="135px"
            onClick={() => setActionConfig({ ...defaultActionConfig })}
          >
            <i className="material-icons">keyboard_backspace</i>
            Select Repo
          </BackButton>
        </>
      );
    }
    return (
      <ActionDetails
        branch={branch}
        setDockerfilePath={this.props.setDockerfilePath}
        setFolderPath={this.props.setFolderPath}
        actionConfig={actionConfig}
        setActionConfig={setActionConfig}
        dockerfilePath={this.props.dockerfilePath}
        folderPath={this.props.folderPath}
        setSelectedRegistry={this.props.setSelectedRegistry}
        selectedRegistry={this.props.selectedRegistry}
      />
    );
  };

  render() {
    return <>{this.renderExpanded()}</>;
  }
}

ActionConfEditor.contextType = Context;

const Br = styled.div`
  width: 100%;
  height: 8px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderButton = styled.div`
  margin-bottom: 5px;
  padding: 5px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-right: 10px;
`;

const RepoHeader = styled.div`
  display: flex;
  align-items: center;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  overflow-y: auto;
`;

const ExpandedWrapperAlt = styled(ExpandedWrapper)``;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  cursor: pointer;
  font-size: 13px;
  height: 35px;
  padding: 5px 13px;
  margin-bottom: -7px;
  padding-right: 15px;
  border: 1px solid #ffffff55;
  border-radius: 3px;
  width: ${(props: { width: string }) => props.width};
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;
