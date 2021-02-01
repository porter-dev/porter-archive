import React, { Component } from 'react';
import styled from 'styled-components';
import github from '../../assets/github.png';

import api from '../../shared/api';
import { RepoType, ActionConfigType } from '../../shared/types';
import { Context } from '../../shared/Context';

import Loading from '../Loading';

type PropsType = {
  actionConfig: ActionConfigType | null,
  setActionConfig: (x: ActionConfigType) => void,
  readOnly: boolean,
};

type StateType = {
  repos: RepoType[],
  loading: boolean,
  error: boolean,
  height: number,
};

export default class ActionConfEditor extends Component<PropsType, StateType> {
  state = {
    repos: [] as RepoType[],
    loading: true,
    error: false,
    height: window.innerHeight - 256,
  }

  componentDidMount() {
    if (this.props.readOnly) {
      window.addEventListener('resize', this.updateHeight.bind(this));
    }

    let { currentProject } = this.context;

    // Get repos
    api.getGitRepos('<token>', {
    }, { project_id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        this.setState({ loading: false, error: true });
      } else {
        var allRepos: any = [];
        for (let i = 0; i < res.data.length; i++) {
          var grid = res.data[i].id;
          api.getGitRepoList('<token>', {}, { project_id: currentProject.id, git_repo_id: grid }, (err: any, res: any) => {
            if (err) {
              console.log(err);
              this.setState({ loading: false, error: true });
            } else {
              res.data.forEach((repo: any, id: number) => {
                repo.GHRepoID = grid;
              })
              allRepos = allRepos.concat(res.data);
              this.setState({ repos: allRepos, loading: false, error: false });
            }
          })
        }
        if (res.data.length < 1) {
          this.setState({ loading: false, error: false });
        }
      }
    });
  }

  componentWillUnmount() {
    if (this.props.readOnly) {
      window.removeEventListener('resize', this.updateHeight.bind(this));
    }
  }

  updateHeight = () => {
    this.setState({ height: window.innerHeight - 256 });
  }

  setRepo = (x: RepoType) => {
    let { actionConfig, setActionConfig } = this.props;
    let updatedConfig = actionConfig;
    updatedConfig.git_repo = x.FullName;
    updatedConfig.git_repo_id = x.GHRepoID;
    setActionConfig(updatedConfig);
  }

  renderRepoList = () => {
    let { repos, loading, error } = this.state;
    if (loading) {
      return <LoadingWrapper><Loading /></LoadingWrapper>
    } else if (error || !repos) {
      return <LoadingWrapper>Error loading repos.</LoadingWrapper>
    } else if (repos.length == 0) {
      return <LoadingWrapper>No connected repos found.</LoadingWrapper>
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
          <img src={github} />{repo.FullName}
        </RepoName>
      );
    });
  }

  renderExpanded = () => {
    if (this.props.readOnly) {
      return (
        <ExpandedWrapperAlt
          heightLimit={this.state.height}
        >
          {this.renderRepoList()}
        </ExpandedWrapperAlt>
      );
    } else {
      return (
        <ExpandedWrapper>
          {this.renderRepoList()}
        </ExpandedWrapper>
      );
    }
  }

  render() {
    return (
      <>
        {this.renderExpanded()}
      </>
    );
  }
}

ActionConfEditor.contextType = Context;

const RepoName = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid ${(props: { lastItem: boolean, isSelected: boolean, readOnly: boolean }) => props.lastItem ? '#00000000' : '#606166'};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: ${(props: { lastItem: boolean, isSelected: boolean, readOnly: boolean }) => props.readOnly ? 'default' : 'pointer'};
  pointer-events: ${(props: { lastItem: boolean, isSelected: boolean, readOnly: boolean }) => props.readOnly ? 'none' : 'auto'};
  background: ${(props: { lastItem: boolean, isSelected: boolean, readOnly: boolean }) => props.isSelected ? '#ffffff22' : '#ffffff11'};
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
  max-height: ${(props: { heightLimit: number }) => props.heightLimit}px;
  overflow-y: auto;
`;