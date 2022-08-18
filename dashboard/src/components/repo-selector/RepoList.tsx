import React, { useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import github from "assets/github-white.png";

import api from "shared/api";
import { ActionConfigType, RepoType } from "shared/types";
import { Context } from "shared/Context";

import Loading from "../Loading";
import SearchBar from "../SearchBar";
import DynamicLink from "components/DynamicLink";
import { useOutsideAlerter } from "shared/hooks/useOutsideAlerter";

type Props = {
  actionConfig: ActionConfigType | null;
  setActionConfig: (x: ActionConfigType) => void;
  userId?: number;
  readOnly: boolean;
  filteredRepos?: string[];
};

type Provider =
  | {
      provider: "github";
      name: string;
      installation_id: number;
    }
  | {
      provider: "gitlab";
      instance_url: string;
      integration_id: number;
    };

// Sort provider by name if it's github or instance url if it's gitlab
const sortProviders = (providers: Provider[]) => {
  const githubProviders = providers.filter(
    (provider) => provider.provider === "github"
  );

  const gitlabProviders = providers.filter(
    (provider) => provider.provider === "gitlab"
  );

  const githubSortedProviders = githubProviders.sort((a, b) => {
    if (a.provider === "github" && b.provider === "github") {
      return a.name.localeCompare(b.name);
    }
  });

  const gitlabSortedProviders = gitlabProviders.sort((a, b) => {
    if (a.provider === "gitlab" && b.provider === "gitlab") {
      return a.instance_url.localeCompare(b.instance_url);
    }
  });
  return [...gitlabSortedProviders, ...githubSortedProviders];
};

const RepoList: React.FC<Props> = ({
  actionConfig,
  setActionConfig,
  userId,
  readOnly,
  filteredRepos,
}) => {
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [repos, setRepos] = useState<RepoType[]>([]);
  const [repoLoading, setRepoLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoError, setRepoError] = useState(false);
  const [searchFilter, setSearchFilter] = useState(null);
  const [hasProviders, setHasProviders] = useState(true);
  const { currentProject, setCurrentError } = useContext(Context);

  useEffect(() => {
    let isSubscribed = true;
    api
      .getGitProviders("<token>", {}, { project_id: currentProject.id })
      .then((res) => {
        const data = res.data;
        if (!isSubscribed) {
          return;
        }

        if (!Array.isArray(data)) {
          setHasProviders(false);
          return;
        }

        const sortedProviders = sortProviders(data);
        setProviders(sortedProviders);
        setCurrentProvider(sortedProviders[0]);
      })
      .catch((err) => {
        setHasProviders(false);
        setCurrentError(err);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const loadGithubRepos = async (repoId: number) => {
    try {
      const res = await api.getGitRepoList<
        { FullName: string; Kind: "github" }[]
      >("<token>", {}, { project_id: currentProject.id, git_repo_id: repoId });

      const repos = res.data.map((repo) => ({ ...repo, GHRepoID: repoId }));
      return repos;
    } catch (error) {}
  };

  const loadGitlabRepos = async (integrationId: number) => {
    try {
      const res = await api.getGitlabRepos<string[]>(
        "<token>",
        {},
        { project_id: currentProject.id, integration_id: integrationId }
      );
      const repos: RepoType[] = res.data.map((repo) => ({
        FullName: repo,
        Kind: "gitlab",
        GitIntegrationId: integrationId,
      }));
      return repos;
    } catch (error) {}
  };

  const loadRepos = (provider: any) => {
    if (provider.provider === "github") {
      return loadGithubRepos(provider.installation_id);
    } else {
      return loadGitlabRepos(provider.integration_id);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    if (!currentProvider) {
      return () => {
        isSubscribed = false;
      };
    }

    setRepoLoading(true);

    loadRepos(currentProvider)
      .then((repos) => {
        if (isSubscribed) {
          setRepos(repos);
        }
      })
      .catch((err) => {
        setRepos([]);
        console.log(err);
      })
      .finally(() => {
        setRepoLoading(false);
      });
  }, [currentProvider]);

  // clear out actionConfig and SelectedRepository if new search is performed
  useEffect(() => {
    setActionConfig({
      git_repo: null,
      image_repo_uri: null,
      git_branch: null,
      git_repo_id: 0,
      kind: "github",
    });
    setSelectedRepo(null);
  }, [searchFilter]);

  const setRepo = (x: RepoType) => {
    let repoConfig: any;
    if (x.Kind === "gitlab") {
      repoConfig = {
        kind: "gitlab",
        git_repo: x.FullName,
        gitlab_integration_id: x.GitIntegrationId,
      };
    } else {
      repoConfig = {
        kind: "github",
        git_repo: x.FullName,
        git_repo_id: x.GHRepoID,
      };
    }

    const updatedConfig = {
      ...actionConfig,
      ...repoConfig,
    };

    setActionConfig(updatedConfig);
    setSelectedRepo(x.FullName);
  };

  const renderRepoList = () => {
    if (repoLoading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    } else if (repoError) {
      return <LoadingWrapper>Error loading repos.</LoadingWrapper>;
    } else if (!Array.isArray(repos) || repos.length === 0) {
      if (currentProvider.provider === "gitlab") {
        return (
          <LoadingWrapper>
            GitLab could not be reached.
            <A
              to={`${window.location.origin}/api/projects/${currentProject.id}/oauth/gitlab?integration_id=${currentProvider.integration_id}`}
            >
              Connect your GitLab account to Porter
            </A>
            or select another Git provider.
          </LoadingWrapper>
        );
      } else {
        return (
          <LoadingWrapper>
            No connected Github repos found. You can
            <A
              to={`${window.location.origin}/api/integrations/github-app/install`}
            >
              Install Porter in more repositories
            </A>
            or select another git provider.
          </LoadingWrapper>
        );
      }
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
        const shouldDisable = !!filteredRepos?.find(
          (filteredRepo) => repo.FullName === filteredRepo
        );
        return (
          <RepoName
            key={i}
            isSelected={repo.FullName === selectedRepo}
            lastItem={i === repos.length - 1}
            onClick={() => setRepo(repo)}
            readOnly={readOnly}
            disabled={shouldDisable}
          >
            {repo.Kind === "github" ? (
              <img src={github} alt={"github icon"} />
            ) : (
              <i className="devicon-gitlab-plain colored" />
            )}
            {repo.FullName}
            {shouldDisable && ` - This repo was already added`}
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
          <div style={{ display: "flex", marginBottom: "10px" }}>
            <ProviderSelector
              values={providers}
              currentValue={currentProvider}
              onChange={setCurrentProvider}
            />
            <SearchBar
              setSearchFilter={setSearchFilter}
              disabled={repoError || repoLoading}
              prompt={"Search repos . . ."}
              fullWidth
            />
          </div>
          <RepoListWrapper>
            <ExpandedWrapper>{renderRepoList()}</ExpandedWrapper>
          </RepoListWrapper>
        </>
      );
    }
  };

  if (!hasProviders) {
    return (
      <>
        <RepoListWrapper>
          <ExpandedWrapper>
            <LoadingWrapper>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div>A connected Git provider wasn't found.</div>
                <div>
                  You can
                  <A
                    to={`${window.location.origin}/api/integrations/github-app/install`}
                  >
                    connect a GitHub repo
                  </A>
                  or
                  <A to={"/integrations"}>add a GitLab instance</A>
                </div>
              </div>
            </LoadingWrapper>
          </ExpandedWrapper>
        </RepoListWrapper>
      </>
    );
  }

  return <>{renderExpanded()}</>;
};

export default RepoList;

const ProviderSelector = (props: {
  values: any[];
  currentValue: any;
  onChange: (provider: any) => void;
}) => {
  const wrapperRef = useRef();
  const { values, currentValue, onChange } = props;
  const [isOpen, setIsOpen] = useState(false);
  const icon = `devicon-${currentValue?.provider}-plain colored`;
  useOutsideAlerter(wrapperRef, () => {
    setIsOpen(false);
  });

  if (!currentValue) {
    return (
      <ProviderSelectorStyles.Wrapper>
        <Loading />
      </ProviderSelectorStyles.Wrapper>
    );
  }

  return (
    <>
      <ProviderSelectorStyles.Wrapper ref={wrapperRef} isOpen={isOpen}>
        <ProviderSelectorStyles.Icon className={icon} />

        <ProviderSelectorStyles.Button
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {currentValue?.name || currentValue?.instance_url}
        </ProviderSelectorStyles.Button>
        <i className="material-icons">arrow_drop_down</i>
        {isOpen ? (
          <>
            <ProviderSelectorStyles.OptionWrapper>
              {values.map((provider) => {
                return (
                  <ProviderSelectorStyles.Option
                    onClick={() => {
                      setIsOpen(false);
                      onChange(provider);
                    }}
                  >
                    <ProviderSelectorStyles.Icon
                      className={`devicon-${provider?.provider}-plain colored`}
                    />
                    <ProviderSelectorStyles.Text>
                      {provider?.name || provider?.instance_url}
                    </ProviderSelectorStyles.Text>
                  </ProviderSelectorStyles.Option>
                );
              })}
            </ProviderSelectorStyles.OptionWrapper>
          </>
        ) : null}
      </ProviderSelectorStyles.Wrapper>
    </>
  );
};

const ProviderSelectorStyles = {
  Wrapper: styled.div<{ isOpen?: boolean }>`
    position: relative;
    margin-bottom: 10px;
    height: 40px;
    display: flex;
    min-width: 50%;
    cursor: pointer;
    margin-right: 10px;
    margin-left: 2px;
    align-items: center;

    > i {
      margin-left: -26px;
      margin-right: 10px;
      z-index: 0;
      transform: ${(props) => (props.isOpen ? "rotate(180deg)" : "")};
    }
  `,
  Button: styled.div`
    height: 100%;
    font-weight: bold;
    font-size: 14px;
    border-bottom: 0;
    z-index: 999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 6px 15px;
    padding-left: 40px;
    padding-right: 28px;
    border-bottom: 2px solid #ffffff;
    padding-top: 11px;
  `,
  OptionWrapper: styled.div`
    top: 40px;
    position: absolute;
    background: #37393f;
    border-radius: 3px;
    max-height: 300px;
    overflow-y: auto;
    width: calc(100% - 4px);
    box-shadow: 0 8px 20px 0px #00000088;
    z-index: 999;
  `,
  Option: styled.div`
    display: flex;
    align-items: center;

    :hover {
      background-color: #ffffff22;
    }
  `,
  Icon: styled.span`
    font-size: 24px;
    margin-left: 9px;
    margin-right: -29px;
    color: white;
  `,
  Text: styled.div`
    font-weight: bold;
    font-size: 14px;
    margin-left: 40px;
    height: 45px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 8px 10px;
    width: 100%;
    padding-top: 14px;
    padding-left: 0;
  `,
};

const RepoListWrapper = styled.div`
  border: 1px solid #ffffff55;
  border-radius: 3px;
  overflow-y: auto;
`;

type RepoNameProps = {
  lastItem: boolean;
  isSelected: boolean;
  readOnly: boolean;
  disabled: boolean;
};

const RepoName = styled.div<RepoNameProps>`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props) => (props.lastItem ? "#00000000" : "#606166")};
  color: ${(props) => (props.disabled ? "#ffffff88" : "#ffffff")};
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  cursor: ${(props) =>
    props.readOnly || props.disabled ? "default" : "pointer"};
  pointer-events: ${(props) =>
    props.readOnly || props.disabled ? "none" : "auto"};

  ${(props) => {
    if (props.disabled) {
      return "";
    }

    if (props.isSelected) {
      return `background: #ffffff22;`;
    }

    return `background: #ffffff11;`;
  }}

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

const A = styled(DynamicLink)`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;
  margin-right: 5px;

  cursor: pointer;
`;
