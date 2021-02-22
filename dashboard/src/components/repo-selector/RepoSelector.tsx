import React, { Component } from "react";
import styled from "styled-components";
import github from "assets/github.png";
import info from "assets/info.svg";
import { RepoType, ChartType, ActionConfigType } from "../../shared/types";
import { Context } from "../../shared/Context";

import ButtonTray from "./ButtonTray";
import ActionConfEditor from "./ActionConfEditor";

type PropsType = {
  chart: ChartType | null;
  forceExpanded?: boolean;
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
};

type StateType = {
  isExpanded: boolean;
  repos: RepoType[];
  branch: string;
  pathIsSet: boolean;
  dockerfileSelected: boolean;
};

export default class RepoSelector extends Component<PropsType, StateType> {
  state = {
    isExpanded: this.props.forceExpanded,
    repos: [] as RepoType[],
    branch: "",
    pathIsSet: false,
    dockerfileSelected: false,
  };

  renderExpanded = () => {
    let { actionConfig, setActionConfig, chart } = this.props;

    return (
      <div>
        <ActionConfEditor
          actionConfig={actionConfig}
          branch={this.state.branch}
          pathIsSet={this.state.pathIsSet}
          setActionConfig={setActionConfig}
          setBranch={(branch: string) => this.setState({ branch })}
          setPath={(pathIsSet: boolean) => this.setState({ pathIsSet })}
        />
        <ButtonTray
          chartName={chart.name}
          chartNamespace={chart.namespace}
          pathIsSet={this.state.pathIsSet}
          branch={this.state.branch}
          actionConfig={actionConfig}
          setBranch={(branch: string) => this.setState({ branch })}
          setActionConfig={setActionConfig}
          setPath={(pathIsSet: boolean) => this.setState({ pathIsSet })}
        />
      </div>
    );
  };

  renderSelected = () => {
    let { actionConfig } = this.props;
    if (actionConfig.git_repo) {
      let subdir =
        actionConfig.dockerfile_path === ""
          ? ""
          : "/" + actionConfig.dockerfile_path;
      return (
        <RepoLabel>
          <img src={github} />
          {actionConfig.git_repo + subdir}
          <SelectedBranch>
            {!this.state.branch ? "(Select Branch)" : this.state.branch}
          </SelectedBranch>
        </RepoLabel>
      );
    }
    return (
      <RepoLabel>
        <img src={info} />
        No source selected
      </RepoLabel>
    );
  };

  handleClick = () => {
    if (!this.props.forceExpanded) {
      this.setState({ isExpanded: !this.state.isExpanded });
    }
  };

  render() {
    return (
      <>
        <StyledRepoSelector
          onClick={this.handleClick}
          isExpanded={this.state.isExpanded}
          forceExpanded={this.props.forceExpanded}
        >
          {this.renderSelected()}
          {this.props.forceExpanded ? null : (
            <i className="material-icons">
              {this.state.isExpanded ? "close" : "build"}
            </i>
          )}
        </StyledRepoSelector>

        {this.state.isExpanded ? this.renderExpanded() : null}
      </>
    );
  }
}

RepoSelector.contextType = Context;

const SelectedBranch = styled.div`
  color: #ffffff55;
  margin-left: 10px;
`;

const ExpandedWrapper = styled.div`
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  overflow-y: auto;
`;

const RepoLabel = styled.div`
  display: flex;
  align-items: center;

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const StyledRepoSelector = styled.div`
  width: 100%;
  margin-top: 22px;
  border: 1px solid #ffffff55;
  background: ${(props: { isExpanded: boolean; forceExpanded: boolean }) =>
    props.isExpanded ? "#ffffff11" : ""};
  border-radius: 3px;
  user-select: none;
  height: 40px;
  font-size: 13px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: ${(props: { isExpanded: boolean; forceExpanded: boolean }) =>
    props.forceExpanded ? "" : "pointer"};
  :hover {
    background: #ffffff11;

    > i {
      background: #ffffff22;
    }
  }

  > i {
    font-size: 16px;
    color: #ffffff66;
    margin-right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    padding: 4px;
  }
`;
