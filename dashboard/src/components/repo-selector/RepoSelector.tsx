import React, { Component } from 'react';
import styled from 'styled-components';
import github from '../../assets/github.png';
import info from '../../assets/info.svg';

import api from '../../shared/api';
import { RepoType, ChartType } from '../../shared/types';
import { Context } from '../../shared/Context';

import Loading from '../../components/Loading';
import BranchList from './BranchList';
import ContentsList from './ContentsList';
import NewGHAction from './NewGHAction';

type PropsType = {
  chart: ChartType | null,
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
  branchGrID: number,
  dockerfileSelected: boolean,
  imageURL: string,
};

export default class RepoSelector extends Component<PropsType, StateType> {
  state = {
    isExpanded: this.props.forceExpanded,
    loading: true,
    error: false,
    repos: [] as RepoType[],
    branchGrID: null as number,
    dockerfileSelected: false,
    imageURL: null as string,
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
        let counter = 0;
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

  createGHAction = () => {
    let { currentProject, currentCluster } = this.context;
    let path = this.props.subdirectory + '/Dockerfile';
    if (path[0] === '/') {
      path = path.substring(1, path.length);
    }

    api.createGHAction('<token>', {
      git_repo: this.props.selectedRepo.FullName,
      image_repo_uri: this.state.imageURL,
      dockerfile_path: path,
      git_repo_id: this.props.selectedRepo.GHRepoID,
    }, {
      project_id: currentProject.id,
      CLUSTER_ID: currentCluster.id,
      RELEASE_NAME: this.props.chart.name,
      RELEASE_NAMESPACE: this.props.chart.namespace,
    }, (err: any, res: any) => {
      if (err) {
        console.log(err);
        this.setState({ error: true });
      } else {
        console.log(res.data);
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
              grid={selectedRepo.GHRepoID}
              setSelectedBranch={(branch: string) => {
                this.setState({ branchGrID: selectedRepo.GHRepoID });
                setSelectedBranch(branch);
              }}
              repoName={selectedRepo.FullName.split('/')[1]}
              owner={selectedRepo.FullName.split('/')[0]}
              selectedBranch={selectedBranch}
            />
          </ExpandedWrapperAlt>
          <ButtonTray>
            <BackButton
              width='130px'
              onClick={() => setSelectedRepo(null)}
            >
              <i className="material-icons">keyboard_backspace</i>
              Select Repo
            </BackButton>
          </ButtonTray>
        </div>
      );
    } else if (this.state.dockerfileSelected) {
      return (
        <div>
          <ExpandedWrapperAlt>
            <NewGHAction
              repoName={selectedRepo.FullName}
              dockerPath={subdirectory + '/Dockerfile'}
              grid={this.state.branchGrID}
              chart={this.props.chart}
              imgURL={this.state.imageURL}
              setURL={(x: string) => this.setState({ imageURL: x })}
            />
          </ExpandedWrapperAlt>
          <ButtonTray>
            <BackButton
              width='130px'
              onClick={() => this.setState({ dockerfileSelected: false })}
            >
              <i className='material-icons'>keyboard_backspace</i>
              Select Dockerfile
            </BackButton>
            <BackButton
              width='146px'
              onClick={() => this.createGHAction()}
            >
              <i className='material-icons'>play_circle_outline</i>
              Create Github Action
            </BackButton>
          </ButtonTray>
        </div>
      )
    }
    return (
      <div>
        <ExpandedWrapperAlt>
          <ContentsList
            grid={this.state.branchGrID}
            setSubdirectory={(subdirectory: string) => setSubdirectory(subdirectory)}
            repoName={selectedRepo.FullName.split('/')[1]}
            owner={selectedRepo.FullName.split('/')[0]}
            selectedBranch={selectedBranch}
            subdirectory={subdirectory}
            setDockerfile={() => this.setState({ dockerfileSelected: true })}
          />
        </ExpandedWrapperAlt>
        <ButtonTray>
          <BackButton
            onClick={() => {setSelectedBranch(''); setSubdirectory(''); this.setState({ imageURL: '' })}}
            width='140px'
          >
            <i className="material-icons">keyboard_backspace</i>
            Select Branch
          </BackButton>
        </ButtonTray>
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

const ButtonTray = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
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