import React, { useState, useContext, useEffect } from "react";
import styled from "styled-components";
import github from "assets/github.png";

import api from "shared/api";
import { RepoType, ActionConfigType } from "shared/types";
import { Context } from "shared/Context";

import Loading from "../Loading";
import Button from "../Button";

type Props = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
  userId?: number;
  readOnly: boolean;
};

const RepoList = ({
  actionConfig,
  setActionConfig,
  userId,
  readOnly,
}: Props) => {
  const [repos, setRepos] = useState<RepoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const { currentProject } = useContext(Context);

  // TODO: Try to unhook before unmount
  useEffect(() => {
    // Get repos
    if (!userId && userId !== 0) {
      api
        .getGitRepos("<token>", {}, { project_id: currentProject.id })
        .then(async (res) => {
          if (res.data.length == 0) {
            setLoading(false);
            setError(false);
            return;
          }

          var allRepos: any = [];
          var errors: any = [];

          console.log(res);

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

                  resolve(res.data);
                })
                .catch((err) => {
                  errors.push(err);
                  resolve([]);
                });
            });
          });

          var sepRepos = await Promise.all(promises);

          allRepos = [].concat.apply([], sepRepos);

          // remove duplicates based on name
          allRepos = allRepos.filter((repo: any, index: number, self: any) => {
            var keep =
              index ===
              self.findIndex((_repo: any) => {
                return repo.FullName === _repo.FullName;
              });

            return keep;
          });

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
            setLoading(false);
            setError(true);
          } else {
            setRepos(allRepos);
            setLoading(false);
            setError(false);
          }
        })
        .catch((_) => {
          setLoading(false);
          setError(true);
        });
    } else {
      // ??? wouldn't this always be an undefined request?
      let grid = userId;

      api
        .getGitRepoList(
          "<token>",
          {},
          { project_id: currentProject.id, git_repo_id: grid }
        )
        .then((res) => {
          var repos: any = res.data;

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
          setRepos(repos);
          setLoading(false);
          setError(false);
        })
        .catch((_) => {
          setLoading(false);
          setError(true);
        });
    }
  }, []);

  const setRepo = (x: RepoType) => {
    let updatedConfig = actionConfig;
    updatedConfig.git_repo = x.FullName;
    updatedConfig.git_repo_id = x.GHRepoID;
    setActionConfig(updatedConfig);
  };

  const renderRepoList = () => {
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
            href={`/api/oauth/projects/${currentProject.id}/github?redirected=true`}
          >
            log in with GitHub
          </A>
          .
        </LoadingWrapper>
      );
    }

    return repos
      .filter((repo: RepoType, i: number) => {
        return repo.FullName.includes(searchFilter || "");
      })
      .map((repo: RepoType, i: number) => {
        return (
          <RepoName
            key={i}
            isSelected={repo.FullName === actionConfig.git_repo}
            lastItem={i === repos.length - 1}
            onClick={() => setRepo(repo)}
            readOnly={readOnly}
          >
            <img src={github} />
            {repo.FullName}
          </RepoName>
        );
      });
  };

  const renderExpanded = () => {
    if (readOnly) {
      return <ExpandedWrapperAlt>{renderRepoList()}</ExpandedWrapperAlt>;
    } else {
      return (
        <>
          <SearchRow>
            <SearchBar>
              <i className="material-icons">search</i>
              <SearchInput
                value={searchFilter}
                onChange={(e: any) => {
                  setSearchFilter(e.target.value);
                }}
                placeholder="Search repos..."
              />
            </SearchBar>
            <Button>Search</Button>
          </SearchRow>
          <ExpandedWrapper>
            <ExpandedWrapper>{renderRepoList()}</ExpandedWrapper>
          </ExpandedWrapper>
        </>
      );
    }
  };

  return <>{renderExpanded()}</>;
};

export default RepoList;

const SearchRow = styled.div`
  display: flex;
  border-bottom: 1px solid #606166;
`;

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

  > img,
  i {
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

const SearchBar = styled.div`
  display: flex;
  flex: 1;
  margin-top: 7px;
  margin-left: 5px;
`;

const SearchInput = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  width: 100%;
  color: white;
  height: 20px;
`;
