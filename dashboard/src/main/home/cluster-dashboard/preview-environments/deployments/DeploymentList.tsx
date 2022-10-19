import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Selector from "components/Selector";

import Loading from "components/Loading";

import _ from "lodash";
import DeploymentCard from "./DeploymentCard";
import { Environment, PRDeployment, PullRequest } from "../types";
import { useRouting } from "shared/routing";
import { useHistory, useLocation, useParams } from "react-router";
import { deployments, pull_requests } from "../mocks";
import PullRequestCard from "./PullRequestCard";
import DynamicLink from "components/DynamicLink";
import { PreviewEnvironmentsHeader } from "../components/PreviewEnvironmentsHeader";
import SearchBar from "components/SearchBar";
import CheckboxRow from "components/form-components/CheckboxRow";
import DocsHelper from "components/DocsHelper";
import pullRequestIcon from "assets/pull_request_icon.svg";
import DashboardHeader from "../../DashboardHeader";
import Placeholder from "components/Placeholder";

const AvailableStatusFilters = [
  "all",
  "created",
  "failed",
  "active",
  "inactive",
  "not_deployed",
];

type AvailableStatusFiltersType = typeof AvailableStatusFilters[number];

const DeploymentList = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [deploymentList, setDeploymentList] = useState<PRDeployment[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [newCommentsDisabled, setNewCommentsDisabled] = useState(false);

  const [
    statusSelectorVal,
    setStatusSelectorVal,
  ] = useState<AvailableStatusFiltersType>("active");

  const { currentProject, currentCluster } = useContext(Context);
  const { getQueryParam, pushQueryParams } = useRouting();
  const location = useLocation();
  const history = useHistory();
  const { environment_id, repo_name, repo_owner } = useParams<{
    environment_id: string;
    repo_name: string;
    repo_owner: string;
  }>();

  const selectedRepo = `${repo_owner}/${repo_name}`;

  const getPRDeploymentList = () => {
    return api.getPRDeploymentList(
      "<token>",
      {
        environment_id: Number(environment_id),
      },
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
      }
    );
    // return mockRequest();
  };

  const getEnvironment = () => {
    return api.getEnvironment(
      "<token>",
      {},
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
        environment_id: Number(environment_id),
      }
    );
  };

  useEffect(() => {
    const status_filter = getQueryParam("status_filter");

    if (!AvailableStatusFilters.includes(status_filter)) {
      pushQueryParams({}, ["status_filter"]);
      return;
    }

    if (status_filter !== statusSelectorVal) {
      setStatusSelectorVal(status_filter);
    }
  }, [location.search, history]);

  useEffect(() => {
    pushQueryParams({}, ["status_filter"]);
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);

    Promise.allSettled([getPRDeploymentList(), getEnvironment()]).then(
      ([getDeploymentsResponse, getEnvironmentResponse]) => {
        const deploymentList =
          getDeploymentsResponse.status === "fulfilled"
            ? getDeploymentsResponse.value.data
            : {};
        const environmentList =
          getEnvironmentResponse.status === "fulfilled"
            ? getEnvironmentResponse.value.data
            : {};

        if (!isSubscribed) {
          return;
        }

        setDeploymentList(deploymentList.deployments || []);
        setPullRequests(deploymentList.pull_requests || []);

        setNewCommentsDisabled(environmentList.new_comments_disabled || false);

        setIsLoading(false);
      }
    );

    return () => {
      isSubscribed = false;
    };
  }, [currentCluster, currentProject]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const { data } = await getPRDeploymentList();
      setDeploymentList(data.deployments || []);
      setPullRequests(data.pull_requests || []);
    } catch (error) {
      setHasError(true);
      console.error(error);
    }
    try {
      const { data } = await getEnvironment();
      setNewCommentsDisabled(data.new_comments_disabled || false);
    } catch (error) {
      setHasError(true);
      console.error(error);
    }
    setIsLoading(false);
  };

  const handlePreviewEnvironmentManualCreation = (pullRequest: PullRequest) => {
    setPullRequests((prev) => {
      return prev.filter((pr) => {
        return (
          pr.pr_title === pullRequest.pr_title &&
          `${pr.repo_owner}/${pr.repo_name}` ===
            `${pullRequest.repo_owner}/${pullRequest.repo_name}`
        );
      });
    });
    handleRefresh();
  };

  const searchFilter = (value: string | number) => {
    const val = String(value);

    return val.toLowerCase().includes(searchValue.toLowerCase());
  };

  const filteredDeployments = useMemo(() => {
    // Only filter out inactive when status filter is "active"
    if (statusSelectorVal === "active") {
      return deploymentList
        .filter((d) => {
          return d.status !== "inactive";
        })
        .filter((d) => {
          return Object.values(d).find(searchFilter) !== undefined;
        });
    }

    if (statusSelectorVal === "inactive") {
      return deploymentList
        .filter((d) => {
          return d.status === "inactive";
        })
        .filter((d) => {
          return Object.values(d).find(searchFilter) !== undefined;
        });
    }

    return deploymentList;
  }, [statusSelectorVal, deploymentList, searchValue]);

  const filteredPullRequests = useMemo(() => {
    if (statusSelectorVal !== "inactive") {
      return [];
    }

    return pullRequests.filter((pr) => {
      return Object.values(pr).find(searchFilter) !== undefined;
    });
  }, [pullRequests, statusSelectorVal, searchValue]);

  const renderDeploymentList = () => {
    if (isLoading) {
      return (
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      );
    }

    if (!deploymentList.length && !pullRequests.length) {
      return (
        <Placeholder height="calc(100vh - 400px)">
          No preview apps have been found. Open a PR to create a new preview
          app.
        </Placeholder>
      );
    }

    if (!filteredDeployments.length && !filteredPullRequests.length) {
      return (
        <Placeholder height="calc(100vh - 400px)">
          No preview apps have been found with the given filter.
        </Placeholder>
      );
    }

    return (
      <>
        {filteredPullRequests.map((pr) => {
          return (
            <PullRequestCard
              key={pr.pr_title}
              pullRequest={pr}
              onCreation={handlePreviewEnvironmentManualCreation}
            />
          );
        })}
        {filteredDeployments.map((d) => {
          return (
            <DeploymentCard
              key={d.id}
              deployment={d}
              onDelete={handleRefresh}
              onReEnable={handleRefresh}
              onReRun={handleRefresh}
            />
          );
        })}
      </>
    );
  };

  const handleStatusFilterChange = (value: string) => {
    pushQueryParams({ status_filter: value });
    setStatusSelectorVal(value);
  };

  const handleToggleCommentStatus = (currentlyDisabled: boolean) => {
    api
      .toggleNewCommentForEnvironment(
        "<token>",
        {
          disable: !currentlyDisabled,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          environment_id: Number(environment_id),
        }
      )
      .then(() => {
        setNewCommentsDisabled(!currentlyDisabled);
      });
  };

  return (
    <>
      <BreadcrumbRow>
        <Breadcrumb to="/preview-environments">
          <ArrowIcon src={pullRequestIcon} />
          <Wrap>Preview environments</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <DashboardHeader
        image="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png"
        title={
          <Flex>
            <StyledLink 
              to={`https://github.com/${selectedRepo}`}
              target="_blank"
            >
              {selectedRepo}
            </StyledLink>
            <DynamicLink
              to={`/preview-environments/deployments/${environment_id}/${repo_owner}/${repo_name}/settings`}
            >
              <I
                className="material-icons"
              >
                more_vert
              </I>
            </DynamicLink>
          </Flex>
        }
        description={`Preview environments for the ${selectedRepo} repository.`}
        disableLineBreak
        capitalize={false}
      />
      <Flex>
        <ActionsWrapper>
          <StyledStatusSelector>
            <RefreshButton color={"#7d7d81"} onClick={handleRefresh}>
              <i className="material-icons">refresh</i>
            </RefreshButton>
            <SearchRow>
              <i className="material-icons">search</i>
              <SearchInput
                value={searchValue}
                onChange={(e: any) => {
                  setSearchValue(e.target.value);
                }}
                placeholder="Search"
              />
            </SearchRow>
            <Selector
              activeValue={statusSelectorVal}
              setActiveValue={handleStatusFilterChange}
              options={[
                {
                  value: "active",
                  label: "Active",
                },
                {
                  value: "inactive",
                  label: "Inactive",
                },
              ]}
              dropdownLabel="Status"
              width="150px"
              dropdownWidth="230px"
              closeOverlay={true}
            />
          </StyledStatusSelector>
        </ActionsWrapper>
      </Flex>
      <Container>
        <EventsGrid>{renderDeploymentList()}</EventsGrid>
      </Container>
    </>
  );
};

export default DeploymentList;

const mockRequest = () =>
  new Promise((res) => {
    setTimeout(
      () =>
        res({
          data: { deployments: deployments, pull_requests: pull_requests },
        }),
      1000
    );
  });

const LoadingWrapper = styled.div`
  padding-top: 100px;
`;

const I = styled.i`
  font-size: 18px;
  user-select: none;
  margin-left: 15px;
  color: #aaaabb;
  margin-bottom: -3px;
  cursor: pointer;
  width: 30px;
  border-radius: 40px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  :hover {
    background: #26292e;
    border: 1px solid #494b4f; 
  }
`;

const StyledLink = styled(DynamicLink)`
  color: white;
  :hover {
    text-decoration: underline;
  }
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
`;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const Wrap = styled.div`
  z-index: 999;
`;

const Breadcrumb = styled(DynamicLink)`
  color: #aaaabb88;
  font-size: 13px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  margin-top: -10px;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const Div = styled.div`
  margin-bottom: -7px;
`;

const FlexWrap = styled.div`
  display: flex;
  align-items: center;
`;

const BackButton = styled(DynamicLink)`
  cursor: pointer;
  font-size: 24px;
  color: #969fbbaa;
  padding: 3px;
  border-radius: 100px;
  :hover {
    background: #ffffff11;
  }
`;

const Icon = styled.img`
  width: 25px;
  height: 25px;
  margin-right: 6px;
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 500;
  font-family: "Work Sans", sans-serif;
  margin-left: 10px;
  border-radius: 2px;
  color: #ffffff;
`;

const ActionsWrapper = styled.div`
  display: flex;
  margin-left: auto;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props: { color: string }) => props.color};
  cursor: pointer;
  border: none;
  width: 30px;
  height: 30px;
  margin-right: 15px;
  background: none;
  border-radius: 50%;
  margin-left: 10px;
  > i {
    font-size: 20px;
  }
  :hover {
    background-color: rgb(97 98 102 / 44%);
    color: white;
  }
`;

const Container = styled.div`
  margin-top: 33px;
  padding-bottom: 120px;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-row-gap: 20px;
  grid-template-columns: 1;
`;

const StyledStatusSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  :not(:first-child) {
    margin-left: 15px;
  }
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

const SearchRow = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  color: #ffffff55;
  border-radius: 4px;
  user-select: none;
  align-items: center;
  padding: 10px 0px;
  min-width: 300px;
  max-width: min-content;
  max-height: 35px;
  background: #ffffff11;
  margin-right: 15px;

  i {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    font-size: 20px;
  }
`;
