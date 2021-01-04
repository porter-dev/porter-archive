import React, { Component } from 'react';
import styled from 'styled-components';
import github from '../../assets/github.png';
import info from '../../assets/info.svg';

import api from '../../shared/api';
import { RepoType } from '../../shared/types';
import { Context } from '../../shared/Context';

import Loading from '../../components/Loading';
import BranchList from './BranchList';
import ContentsList from './ContentsList';

type PropsType = {
  forceExpanded?: boolean,
  selectedRepo: RepoType | null,
  selectedBranch: string,
  subdirectory: string,
  setSelectedRepo: (x: RepoType) => void,
  setSelectedBranch: (x: string) => void,
  setSubdirectory: (x: string) => void
};

type StateType = {
  isExpanded: boolean,
  loading: boolean,
  error: boolean,
  repos: RepoType[]
};

export default class RepoSelector extends Component<PropsType, StateType> {
  state = {
    isExpanded: this.props.forceExpanded,
    loading: true,
    error: false,
    repos: [] as RepoType[]
  }

  componentDidMount() {
    let { currentProject, currentCluster } = this.context;

    // Get repos
    api.getGitRepos('<token>', {
    }, { project_id: currentProject.id }, (err: any, res: any) => {
      if (err) {
        this.setState({ loading: false, error: true });
      } else {
        this.setState({ repos: res.data, loading: false, error: false });
      }
    });
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
          isSelected={repo === this.props.selectedRepo}
          lastItem={i === repos.length - 1}
          onClick={() => this.props.setSelectedRepo(repo)}
        >
          <img src={github} />{repo.FullName}
        </RepoName>
      );
    });
  }

  renderExpanded = () => {
    let {
      selectedRepo,
      selectedBranch,
      subdirectory,
      setSelectedRepo,
      setSelectedBranch,
      setSubdirectory
    } = this.props;

    if (!selectedRepo) {
      return (
        <ExpandedWrapper>
          {this.renderRepoList()}
        </ExpandedWrapper>
      );
    } else if (selectedBranch === '') {
      return (
        <div>
          <ExpandedWrapperAlt>
            <BranchList
              setSelectedBranch={(branch: string) => setSelectedBranch(branch)}
              repoName={selectedRepo.FullName.split('/')[1]}
              selectedBranch={selectedBranch}
            />
          </ExpandedWrapperAlt>
          <BackButton
            width='130px'
            onClick={() => setSelectedRepo(null)}
          >
            <i className="material-icons">keyboard_backspace</i>
            Select Repo
          </BackButton>
        </div>
      );
    }
    return (
      <div>
        <ExpandedWrapperAlt>
          <ContentsList
            setSubdirectory={(subdirectory: string) => setSubdirectory(subdirectory)}
            repoName={selectedRepo.FullName.split('/')[1]}
            selectedBranch={selectedBranch}
            subdirectory={subdirectory}
          />
        </ExpandedWrapperAlt>
        <BackButton
          onClick={() => setSelectedBranch('')}
          width='140px'
        >
          <i className="material-icons">keyboard_backspace</i>
          Select Branch
        </BackButton>
      </div>
    );
  }

  renderSelected = () => {
    let { selectedRepo, subdirectory, selectedBranch } = this.props;
    if (selectedRepo) {
      let subdir = subdirectory === '' ? '' : '/' + subdirectory;
      return (
        <RepoLabel>
          <img src={github} />
          {selectedRepo.FullName + subdir}
          <SelectedBranch>
            {!selectedBranch ? '(Select Branch)' : selectedBranch}
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
  }

  handleClick = () => {
    if (!this.props.forceExpanded) {
      this.setState({ isExpanded: !this.state.isExpanded });
    }
  }

  render() {
    return (
      <>
        <StyledRepoSelector
          onClick={this.handleClick}
          isExpanded={this.state.isExpanded}
          forceExpanded={this.props.forceExpanded}
        >
          {this.renderSelected()}
          {this.props.forceExpanded ? null : <i className="material-icons">{this.state.isExpanded ? 'close' : 'build'}</i>}
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
  width: ${(props: { width: string }) => props.width};
  color: white;

  :hover {
    background: #ffffff11;
  }

  > i {
    color: white;
    font-size: 18px;
    margin-right: 10px;
  }
`;

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
  background: ${(props: { isExpanded: boolean, forceExpanded: boolean }) => props.isExpanded ? '#ffffff11' : ''};
  border-radius: 3px;
  user-select: none;
  height: 40px;
  font-size: 13px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: ${(props: { isExpanded: boolean, forceExpanded: boolean }) => props.forceExpanded ? '' : 'pointer'};
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