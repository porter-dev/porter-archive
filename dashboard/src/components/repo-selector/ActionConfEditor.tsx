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
  pathIsSet: boolean;
  setActionConfig: (x: ActionConfigType) => void;
  setBranch: (x: string) => void;
  setPath: (x: boolean) => void;
  reset: () => void;
};

type StateType = {
  loading: boolean;
  error: boolean;
};

export default class ActionConfEditor extends Component<PropsType, StateType> {
  state = {
    loading: true,
    error: false,
  };

  renderExpanded = () => {
    let {
      actionConfig,
      branch,
      pathIsSet,
      setActionConfig,
      setBranch,
      setPath,
    } = this.props;

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
    } else if (!branch) {
      return (
        <>
          <ExpandedWrapperAlt>
            <BranchList
              actionConfig={actionConfig}
              setBranch={(branch: string) => setBranch(branch)}
            />
          </ExpandedWrapperAlt>
          {this.renderResetButton()}
        </>
      );
    } else if (!pathIsSet) {
      return (
        <>
          <ExpandedWrapperAlt>
            <ContentsList
              actionConfig={actionConfig}
              branch={branch}
              setActionConfig={setActionConfig}
              setPath={() => setPath(true)}
            />
          </ExpandedWrapperAlt>
          {this.renderResetButton()}
        </>
      );
    }
    return (
      <>
        <ExpandedWrapperAlt>
          <ActionDetails
            actionConfig={actionConfig}
            setActionConfig={setActionConfig}
          />
        </ExpandedWrapperAlt>
        {this.renderResetButton()}
      </>
    );
  };

  renderResetButton = () => {
    return (
      <BackButton width="150px" onClick={this.props.reset}>
        <i className="material-icons">keyboard_backspace</i>
        Reset Selection
      </BackButton>
    );
  };

  render() {
    return <>{this.renderExpanded()}</>;
  }
}

ActionConfEditor.contextType = Context;

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
  margin-top: 10px;
  cursor: pointer;
  font-size: 13px;
  padding: 5px 13px;
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
