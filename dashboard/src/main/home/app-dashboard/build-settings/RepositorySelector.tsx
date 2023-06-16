import React, { useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import github from "assets/github-white.png";

import api from "shared/api";
import { ActionConfigType, RepoType } from "shared/types";
import { Context } from "shared/Context";

import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import SearchBar from "components/SearchBar";
import ProviderSelector from "./ProviderSelector";
import { PorterApp } from "../types/porterApp";

type Props = {
  readOnly: boolean;
  updatePorterApp: (attrs: Partial<PorterApp>) => void;
  git_repo: string;
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

const RepositorySelector: React.FC<Props> = ({
  readOnly,
  git_repo,
  updatePorterApp,
}) => {
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [repos, setRepos] = useState<RepoType[]>([]);
  const [repoLoading, setRepoLoading] = useState(true);
  const [repoError, setRepoError] = useState(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [hasProviders, setHasProviders] = useState(true);
  const { currentProject, setCurrentError } = useContext(Context);

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
    } catch (error) { }
  };

  const loadRepos = (provider: any) => {
    return loadGithubRepos(provider.installation_id);
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
  }, [currentProvider, searchFilter]);

  // clear out actionConfig and SelectedRepository if new search is performed
  useEffect(() => {
    updatePorterApp({
      repo_name: "",
      git_repo_id: 0,
      git_branch: "",
      image_repo_uri: "",
    });
  }, [searchFilter]);

  const setRepo = (x: RepoType) => {
    updatePorterApp({
      repo_name: x.FullName,
      git_repo_id: x.GHRepoID,
      git_branch: "",
      image_repo_uri: "",
    });
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

    // show 10 most recently used repos if user hasn't searched anything yet
    let results =
      searchFilter != null
        ? repos
          .filter((repo: RepoType) => {
            return repo.FullName.toLowerCase().includes(
              searchFilter.toLowerCase()
            );
          })
          .sort((a: RepoType, b: RepoType) => {
            const aIndex = a.FullName.toLowerCase().indexOf(
              searchFilter.toLowerCase()
            );
            const bIndex = b.FullName.toLowerCase().indexOf(
              searchFilter.toLowerCase()
            );
            return aIndex - bIndex;
          })
        : repos.slice(0, 10);

    if (results.length == 0) {
      return <LoadingWrapper>No matching Github repos found.</LoadingWrapper>;
    } else {
      return results.map((repo: RepoType, i: number) => {
        return (
          <RepoName
            key={i}
            isSelected={repo.FullName === git_repo}
            lastItem={i === repos.length - 1}
            onClick={() => setRepo(repo)}
            readOnly={readOnly}
            disabled={false}
          >
            {repo.Kind === "github" ? (
              <img src={github} alt={"github icon"} />
            ) : (
              <i className="devicon-gitlab-plain colored" />
            )}
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
    const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const encoded_redirect_uri = encodeURIComponent(url);

    return (
      <>
        <ConnectToGithubButton
          href={`/api/integrations/github-app/install?redirect_uri=${encoded_redirect_uri}`}
        >
          <GitHubIcon src={github} /> Install the Porter GitHub app
        </ConnectToGithubButton>
      </>
    );
  }

  return <>{renderExpanded()}</>;
};

export default RepositorySelector;

const GitHubIcon = styled.img`
  width: 20px;
  filter: brightness(150%);
  margin-right: 10px;
`;

const ConnectToGithubButton = styled.a`
  width: 240px;
  justify-content: center;
  border-radius: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  color: white;
  font-weight: 500;
  padding: 10px;
  overflow: hidden;
  white-space: nowrap;
  margin-top: 25px;
  border: 1px solid #494b4f;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#2E3338"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "" : "#353a3e"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

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
