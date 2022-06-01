import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import github from "assets/github.png";

import api from "shared/api";
import { ActionConfigType, RepoType } from "shared/types";
import { Context } from "shared/Context";

import Loading from "../Loading";
import SearchBar from "../SearchBar";
import OptionsDropdown from "components/OptionsDropdown";
import { SelectField } from "material-ui";
import SelectRow from "components/form-components/SelectRow";
import SearchSelector from "components/SearchSelector";

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
  filteredRepos?: string[];
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
  const { currentProject } = useContext(Context);

  // const loadData = async () => {
  //   try {
  //     const { data } = await api.getGithubAccounts("<token>", {}, {});

  //     setAccessData(data);
  //     setAccessLoading(false);
  //   } catch (error) {
  //     setAccessError(true);
  //     setAccessLoading(false);
  //   }

  //   let ids: number[] = [];

  //   if (!userId && userId !== 0) {
  //     ids = await api
  //       .getGitRepos("token", {}, { project_id: currentProject.id })
  //       .then((res) => res.data);
  //   } else {
  //     setRepoLoading(false);
  //     setRepoError(true);
  //     return;
  //   }

  //   const repoListPromises = ids.map((id) =>
  //     api.getGitRepoList(
  //       "<token>",
  //       {},
  //       { project_id: currentProject.id, git_repo_id: id }
  //     )
  //   );

  //   try {
  //     const resolvedRepoList = await Promise.allSettled(repoListPromises);

  //     const repos: RepoType[][] = resolvedRepoList.map((repo) =>
  //       repo.status === "fulfilled" ? repo.value.data : []
  //     );

  //     const names = new Set();
  //     // note: would be better to use .flat() here but you need es2019 for
  //     setRepos(
  //       repos
  //         .map((arr, idx) =>
  //           arr.map((el) => {
  //             el.GHRepoID = ids[idx];
  //             return el;
  //           })
  //         )
  //         .reduce((acc, val) => acc.concat(val), [])
  //         .reduce((acc, val) => {
  //           if (!names.has(val.FullName)) {
  //             names.add(val.FullName);
  //             return acc.concat(val);
  //           } else {
  //             return acc;
  //           }
  //         }, [])
  //     );
  //     setRepoLoading(false);
  //   } catch (err) {
  //     setRepoLoading(false);
  //     setRepoError(true);
  //   }
  // };

  useEffect(() => {
    let isSubscribed = true;
    api
      .getGitProviders("<token>", {}, { project_id: currentProject.id })
      .then((res) => {
        const data = res.data;
        if (isSubscribed) {
          setProviders(data);

          setCurrentProvider(data[0]);
        }
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

  // TODO: Try to unhook before unmount
  // useEffect(() => {
  //   loadData();
  // }, []);

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
            We couldn't reach gitlab to get your repos. You can
            <A
              style={{ marginRight: "5px" }}
              href={`/api/projects/${currentProject.id}/oauth/gitlab?integration_id=${currentProvider.integration_id}`}
            >
              Connect your gitlab account to porter
            </A>
            or select another git provider.
          </LoadingWrapper>
        );
      } else {
        return (
          <LoadingWrapper>
            No connected Github repos found. You can
            <A href={"/api/integrations/github-app/install"}>
              Install Porter in more repositories
            </A>
            .
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
          <div style={{ display: "flex" }}>
            <ProviderSelector
              values={providers}
              currentValue={currentProvider}
              onChange={setCurrentProvider}
            />
            <SearchBar
              setSearchFilter={setSearchFilter}
              disabled={repoError || repoLoading}
              prompt={"Search repos..."}
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

  return <>{renderExpanded()}</>;
};

export default RepoList;

const ProviderSelector = (props: {
  values: any[];
  currentValue: any;
  onChange: (provider: any) => void;
}) => {
  const { values, currentValue, onChange } = props;
  const [isOpen, setIsOpen] = useState(false);
  const icon = `devicon-${currentValue?.provider}-plain colored`;
  return (
    <ProviderSelectorStyles.Wrapper>
      <ProviderSelectorStyles.Button onClick={() => setIsOpen((prev) => !prev)}>
        <ProviderSelectorStyles.Icon className={icon} />
        {currentValue?.name || currentValue?.instance_url}
      </ProviderSelectorStyles.Button>
      {isOpen ? (
        <ProviderSelectorStyles.OptionWrapper>
          {values.map((provider) => {
            return (
              <ProviderSelectorStyles.Option onClick={() => onChange(provider)}>
                <ProviderSelectorStyles.Icon
                  className={`devicon-${provider?.provider}-plain colored`}
                />
                {provider?.name || provider?.instance_url}
              </ProviderSelectorStyles.Option>
            );
          })}
        </ProviderSelectorStyles.OptionWrapper>
      ) : null}
    </ProviderSelectorStyles.Wrapper>
  );
};

const ProviderSelectorStyles = {
  Wrapper: styled.div`
    position: relative;
    margin-bottom: 10px;
    margin-right: 5px;
  `,
  Button: styled.div`
    border-radius: 5px;
    border: 1px solid white;
    height: 100%;
    border-bottom: 0;
    border: 1px solid #ffffff55;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 15px;
  `,
  OptionWrapper: styled.div`
    position: absolute;
    background-color: #202227;
  `,
  Option: styled.div`
    white-space: nowrap;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    :not(:last-child) {
      border-bottom: 1px solid black;
      border-bottom-width: 90%;
    }
    :hover {
      background-color: #363940;
    }
  `,
  Icon: styled.span`
    font-size: 24px;
    margin-right: 15px;
    color: white;
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

const A = styled.a`
  color: #8590ff;
  text-decoration: underline;
  margin-left: 5px;

  cursor: pointer;
`;
