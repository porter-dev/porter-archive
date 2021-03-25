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
  searchFilter: string;
};

export default class RepoList extends Component<PropsType, StateType> {
  state = {
    repos: [] as RepoType[],
    loading: true,
    error: false,
    searchFilter: "",
  };

  // TODO: Try to unhook before unmount
  componentDidMount() {
    let { currentProject } = this.context;

    // Get repos
    if (!this.props.userId && this.props.userId !== 0) {
      api
        .getGitRepos("<token>", {}, { project_id: currentProject.id })
        .then(async (res) => {
          if (res.data.length == 0) {
            this.setState({ loading: false, error: false });
            return
          }

          var allRepos: any = [];
          var errors : any = [];

          var promises = res.data.map((gitrepo: any, id: number) => {
            return new Promise((resolve, reject) => {
              api
                .getGitRepoList(
                  "<token>",
                  {},
                  { project_id: currentProject.id, git_repo_id: gitrepo.id }
                )
                .then((res) => {
                  res.data.forEach((repo: any, id: number) => {
                    repo.GHRepoID = gitrepo.id;
                  });

                  resolve(res.data)
                })
                .catch((err) => {
                  errors.push(err)
                  resolve([])
                });
              })
            })  

          var sepRepos = await Promise.all(promises);

          allRepos = [].concat.apply([], sepRepos);

          // remove duplicates based on name
          allRepos = allRepos.filter((repo : any, index : number, self : any) => {
            var keep = index === self.findIndex((_repo : any) => {
              return repo.FullName === _repo.FullName
            })

            return keep
          })

          // sort repos based on name
          allRepos.sort((a: any, b: any) => {
            if (a.FullName < b.FullName) {
              return -1;
            } else if (a.FullName > b.FullName) {
              return 1;
            } else {
              return 0;
            }
          });

          if (allRepos.length == 0 && errors.length > 0) {
            this.setState({ loading: false, error: true });
          } else {
            this.setState({
              repos: allRepos,
              loading: false,
              error: false,
            });
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
          var repos : any = res.data

          repos.forEach((repo: any, id: number) => {
            repo.GHRepoID = grid;
          });

          repos.sort((a: any, b: any) => {
            if (a.FullName < b.FullName) {
              return -1;
            } else if (a.FullName > b.FullName) {
              return 1;
            } else {
              return 0;
            }
          });

          this.setState({ repos: repos, loading: false, error: false });
        })
        .catch((err) => {
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

    return repos.filter((repo: RepoType, i: number) => {
      return repo.FullName.includes(this.state.searchFilter || "")
    }).map((repo: RepoType, i: number) => {
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
      return <ExpandedWrapperAlt>{this.renderRepoList()}</ExpandedWrapperAlt>
    } else {
      return (
        <ExpandedWrapper>
          <InfoRow
            isSelected={false}
            lastItem={false}
            readOnly={this.props.readOnly}
          >
            <i className="material-icons">search</i>
            <SearchInput 
              value={this.state.searchFilter}
              onChange={(e: any) => {
                this.setState({ searchFilter: e.target.value });
              }}
              placeholder="Search repos..."
            />
          </InfoRow>
          <ExpandedWrapper>
            {this.renderRepoList()}
          </ExpandedWrapper>
        </ExpandedWrapper>
      );
    }
  };

  render() {
    return <>{this.renderExpanded()}</>;
  }
}

RepoList.contextType = Context;

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

  > img,i {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    font-size: 20px;
  }
`;

const InfoRow = styled(RepoName)`
  cursor: default;
  color: #ffffff55;
  :hover {
    background: #ffffff11;

    > i {
      background: none;
    }
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
  max-height: 235px;
  top: 40px; 

  > i {
    font-size: 18px;
    display: block;
    position: absolute; 
    left: 10px; 
    top: 10px; 
  }
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

const SearchInput = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  width: 100%;
  color: white;
  padding: 0;
  height: 20px; 
`;