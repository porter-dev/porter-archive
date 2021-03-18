import React, { Component } from "react";
import styled from "styled-components";
import github from "assets/github.png";
import info from "assets/info.svg";

import api from "shared/api";
import { RepoType, ActionConfigType } from "shared/types";
import { Context } from "shared/Context";

import Loading from "../Loading";

type PropsType = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
  userId?: number;
  readOnly: boolean;
};

type StateType = {
  repos: RepoType[];
  loading: boolean;
  error: boolean;
};

export default class ActionConfEditor extends Component<PropsType, StateType> {
  state = {
    repos: [] as RepoType[],
    loading: true,
    error: false,
  };

  // TODO: Try to unhook before unmount
  componentDidMount() {
    let { currentProject } = this.context;

    // Get repos
    if (!this.props.userId && this.props.userId !== 0) {
      api
        .getGitRepos("<token>", {}, { project_id: currentProject.id })
        .then((res) => {
          var allRepos: any = [];
          // TODO: make into promise.all
          for (let i = 0; i < res.data.length; i++) {
            var grid = res.data[i].id;
            api
              .getGitRepoList(
                "<token>",
                {},
                { project_id: currentProject.id, git_repo_id: grid }
              )
              .then((res) => {
                res.data.forEach((repo: any, id: number) => {
                  repo.GHRepoID = grid;
                });
                allRepos = allRepos.concat(res.data);
                allRepos.sort((a: any, b: any) => {
                  if (a.FullName < b.FullName) {
                    return -1;
                  } else if (a.FullName > b.FullName) {
                    return 1;
                  } else {
                    return 0;
                  }
                });
                this.setState({
                  repos: allRepos,
                  loading: false,
                  error: false,
                });
              })
              .catch((err) => {
                console.log(err);
                this.setState({ loading: false, error: true });
              });
          }
          if (res.data.length < 1) {
            this.setState({ loading: false, error: false });
          }
        })
        .catch((_) => this.setState({ loading: false, error: true }));
    } else {
      let grid = this.props.userId;
      api
        .getGitRepoList(
          "<token>",
          {},
          { project_id: currentProject.id, git_repo_id: grid }
        )
        .then((res) => {
          res.data.forEach((repo: any, id: number) => {
            repo.GHRepoID = grid;
          });
          // TODO: sort repos alphabetically
          this.setState({ repos: res.data, loading: false, error: false });
        })
        .catch((err) => {
          console.log(err);
          this.setState({ loading: false, error: true });
        });
    }
  }

  setRepo = (x: RepoType) => {
    let { actionConfig, setActionConfig } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.git_repo = x.FullName;
    updatedConfig.git_repo_id = x.GHRepoID;
    setActionConfig(updatedConfig);
  };

  renderRepoList = () => {
    let { repos, loading, error } = this.state;
    if (loading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (error || !repos) {
      return <LoadingWrapper>Error loading repos.</LoadingWrapper>;
    } else if (repos.length == 0) {
      return (
        <LoadingWrapper>
          No connected Github repos found. You can
          <A
            href={`/api/oauth/projects/${this.context.currentProject.id}/github?redirected=true`}
          >
            log in with GitHub
          </A>
          .
        </LoadingWrapper>
      );
    }

    return repos.map((repo: RepoType, i: number) => {
      return (
        <RepoName
          key={i}
          isSelected={repo.FullName === this.props.actionConfig.git_repo}
          lastItem={i === repos.length - 1}
          onClick={() => this.setRepo(repo)}
          readOnly={this.props.readOnly}
        >
          <img src={github} />
          {repo.FullName}
        </RepoName>
      );
    });
  };

  renderExpanded = () => {
    if (this.props.readOnly) {
      return <ExpandedWrapperAlt>{this.renderRepoList()}</ExpandedWrapperAlt>;
    } else {
      return (
        <ExpandedWrapper>
          <InfoRow
            isSelected={false}
            lastItem={false}
            readOnly={this.props.readOnly}
          >
            <img src={info} />
            Select Repo
          </InfoRow>
          {this.renderRepoList()}
        </ExpandedWrapper>
      );
    }
  };

  render() {
    return <>{this.renderExpanded()}</>;
  }
}

ActionConfEditor.contextType = Context;

const RepoName = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; isSelected: boolean; readOnly: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: ${(props: {
    lastItem: boolean;
    isSelected: boolean;
    readOnly: boolean;
  }) => (props.readOnly ? "default" : "pointer")};
  pointer-events: ${(props: {
    lastItem: boolean;
    isSelected: boolean;
    readOnly: boolean;
  }) => (props.readOnly ? "none" : "auto")};
  background: ${(props: {
    lastItem: boolean;
    isSelected: boolean;
    readOnly: boolean;
  }) => (props.isSelected ? "#ffffff22" : "#ffffff11")};
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
  }
`;

const InfoRow = styled(RepoName)`
  cursor: default;
  color: #ffffff55;
  :hover {
    background: #ffffff11;
  }
`;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  background: #ffffff11;
  display: flex;
  align-items: center;
  font-size: 13px;
  justify-content: center;
  color: #ffffff44;
`;

const ExpandedWrapper = styled.div`
  width: 100%;
  border-radius: 3px;
  border: 0px solid #ffffff44;
  max-height: 275px;
`;

const ExpandedWrapperAlt = styled(ExpandedWrapper)`
  border: 1px solid #ffffff44;
  max-height: 275px;
  overflow-y: auto;
`;

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  cursor: pointer;
`;
