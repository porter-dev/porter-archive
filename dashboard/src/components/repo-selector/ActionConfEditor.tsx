import React, { Component } from 'react';
import styled from 'styled-components';
import github from '../../assets/github.png';
import info from '../../assets/info.svg';

import api from '../../shared/api';
import { RepoType, ActionConfigType } from '../../shared/types';
import { Context } from '../../shared/Context';

import Loading from '../Loading';
import BranchList from './BranchList';
import ContentsList from './ContentsList';
import ActionDetails from './ActionDetails';

type PropsType = {
  actionConfig: ActionConfigType | null,
  branch: string,
  pathIsSet: boolean,
  setActionConfig: (x: ActionConfigType) => void,
  setBranch: (x: string) => void,
  setPath: (x: boolean) => void,
};

type StateType = {
  repos: RepoType[],
  loading: boolean,
  error: boolean,
};

export default class ActionConfEditor extends Component<PropsType, StateType> {
  state = {
    repos: [] as RepoType[],
    loading: true,
    error: false,
  }

  componentDidMount() {
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
      }
    });
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
        >
          <img src={github} />{repo.FullName}
        </RepoName>
      );
    });
  }

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
          {this.renderRepoList()}
        </ExpandedWrapper>
      );
    } else if (!branch) {
      return (
        <ExpandedWrapperAlt>
          <BranchList
            actionConfig={actionConfig}
            setBranch={(branch: string) => setBranch(branch)}
          />
        </ExpandedWrapperAlt>
      );
    } else if (!pathIsSet) {
      return (
        <ExpandedWrapperAlt>
          <ContentsList
            actionConfig={actionConfig}
            branch={branch}
            setActionConfig={setActionConfig}
            setPath={() => setPath(true)}
          />
        </ExpandedWrapperAlt>
      );
    }
    return (
      <ExpandedWrapperAlt>
        <ActionDetails
          actionConfig={actionConfig}
          setActionConfig={setActionConfig}
        />
      </ExpandedWrapperAlt>
    )
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
  border-bottom: 1px solid ${(props: { lastItem: boolean, isSelected: boolean }) => props.lastItem ? '#00000000' : '#606166'};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: pointer;
  background: ${(props: { isSelected: boolean, lastItem: boolean }) => props.isSelected ? '#ffffff22' : '#ffffff11'};
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
  margin-top: 10px;
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 275px;
  overflow-y: auto;
`;

const ExpandedWrapperAlt = styled(ExpandedWrapper)`
`;