import React, { useState, useContext, useEffect } from "react";
import styled from "styled-components";
import github from "assets/github.png";

import api from "shared/api";
import { RepoType, ActionConfigType } from "shared/types";
import { Context } from "shared/Context";

import Loading from "../Loading";
import SearchBar from "../SearchBar";
import Helper from "../values-form/Helper";

interface GithubAppAccessData {
  has_access: boolean;
  username?: string;
  accounts?: string[];
}

type Props = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
  userId?: number;
  readOnly: boolean;
};

const RepoList: React.FC<Props> = ({
  actionConfig,
  setActionConfig,
  userId,
  readOnly,
}) => {
  const [repos, setRepos] = useState<RepoType[]>([]);
  const [repoLoading, setRepoLoading] = useState(true);
  const [repoError, setRepoError] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(false);
  const [accessData, setAccessData] = useState<GithubAppAccessData>({
    has_access: false,
  });
  const [searchFilter, setSearchFilter] = useState(null);
  const { currentProject } = useContext(Context);

  // TODO: Try to unhook before unmount
  useEffect(() => {
    api
      .getGithubAccess("<token>", {}, {})
      .then(({ data }) => {
        setAccessData(data);
        setAccessLoading(false);
      })
      .catch(() => {
        setAccessError(true);
        setAccessLoading(false);
      })
      .finally(() => {
        // load git repo ids, and then repo names from that
        // this only happens once during the lifecycle
        new Promise((resolve, reject) => {
          if (!userId && userId !== 0) {
            api
              .getGitRepos("<token>", {}, { project_id: currentProject.id })
              .then(async (res) => {
                resolve(res.data);
              })
              .catch(() => {
                resolve([]);
              });
          } else {
            reject(null);
          }
        })
          .then((ids: number[]) => {
            Promise.all(
              ids.map((id) => {
                return new Promise((resolve, reject) => {
                  api
                    .getGitRepoList(
                      "<token>",
                      {},
                      { project_id: currentProject.id, git_repo_id: id }
                    )
                    .then((res) => {
                      resolve(res.data);
                    })
                    .catch((err) => {
                      reject(err);
                    });
                });
              })
            )
              .then((repos: RepoType[][]) => {
                const names = new Set();
                // note: would be better to use .flat() here but you need es2019 for
                setRepos(
                  repos
                    .map((arr, idx) =>
                      arr.map((el) => {
                        el.GHRepoID = ids[idx];
                        return el;
                      })
                    )
                    .reduce((acc, val) => acc.concat(val), [])
                    .reduce((acc, val) => {
                      if (!names.has(val.FullName)) {
                        names.add(val.FullName);
                        return acc.concat(val);
                      } else {
                        return acc;
                      }
                    }, [])
                );
                setRepoLoading(false);
              })
              .catch((_) => {
                setRepoLoading(false);
                setRepoError(true);
              });
          })
          .catch((_) => {
            setRepoLoading(false);
            setRepoError(true);
          });
      });
  }, []);

  const setRepo = (x: RepoType) => {
    let updatedConfig = actionConfig;
    updatedConfig.git_repo = x.FullName;
    updatedConfig.git_repo_id = x.GHRepoID;
    setActionConfig(updatedConfig);
  };

  const renderRepoList = () => {
    if (repoLoading || accessLoading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (repoError || accessError) {
      return <LoadingWrapper>Error loading repos.</LoadingWrapper>;
    } else if (repos.length == 0) {
      return accessData.has_access ? (
        <LoadingWrapper>
          No connected Github repos found. You can
          <A href={"/api/integrations/github-app/install"}>
            Install Porter in more repositories
          </A>
          .
        </LoadingWrapper>
      ) : (
        <LoadingWrapper>
          No connected Github repos found.
          <A href={"/api/integrations/github-app/oauth"}>
            Authorize Porter to view your repositories.
          </A>
        </LoadingWrapper>
      );
    }

    // show 10 most recently used repos if user hasn't searched anything yet
    let results =
      searchFilter != null
        ? repos.filter((repo: RepoType) => {
            return repo.FullName.toLowerCase().includes(
              searchFilter.toLowerCase() || ""
            );
          })
        : repos.slice(0, 10);

    if (results.length == 0) {
      return <LoadingWrapper>No matching Github repos found.</LoadingWrapper>;
    } else {
      return results.map((repo: RepoType, i: number) => {
        return (
          <RepoName
            key={i}
            isSelected={repo.FullName === actionConfig.git_repo}
            lastItem={i === repos.length - 1}
            onClick={() => setRepo(repo)}
            readOnly={readOnly}
          >
            <img src={github} alt={"github icon"} />
            {repo.FullName}
          </RepoName>
        );
      });
    }
  };

  const renderExpanded = () => {
    if (readOnly) {
      return <ExpandedWrapperAlt>{renderRepoList()}</ExpandedWrapperAlt>;
    } else {
      return (
        <>
          <SearchBar
            setSearchFilter={setSearchFilter}
            disabled={repoError || repoLoading || accessError || accessLoading}
            prompt={"Search repos..."}
          />
          <RepoListWrapper>
            <ExpandedWrapper>{renderRepoList()}</ExpandedWrapper>
          </RepoListWrapper>
        </>
      );
    }
  };

  return <>{renderExpanded()}</>;
};

export default RepoList;

const RepoListWrapper = styled.div`
  border: 1px solid #ffffff55;
  border-radius: 3px;
  overflow-y: auto;
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
  max-height: 221px;
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
