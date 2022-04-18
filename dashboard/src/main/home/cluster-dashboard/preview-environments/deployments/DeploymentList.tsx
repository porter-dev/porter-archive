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
import { useHistory, useLocation } from "react-router";
import { deployments, pull_requests } from "../mocks";
import PullRequestCard from "./PullRequestCard";

const AvailableStatusFilters = [
  "all",
  "created",
  "failed",
  "active",
  "inactive",
  "not_deployed",
];

type AvailableStatusFiltersType = typeof AvailableStatusFilters[number];

const DeploymentList = ({ environments }: { environments: Environment[] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [deploymentList, setDeploymentList] = useState<PRDeployment[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);

  const [
    statusSelectorVal,
    setStatusSelectorVal,
  ] = useState<AvailableStatusFiltersType>("active");
  const [selectedRepo, setSelectedRepo] = useState("");

  const { currentProject, currentCluster } = useContext(Context);
  const { getQueryParam, pushQueryParams } = useRouting();
  const location = useLocation();
  const history = useHistory();

  const getPRDeploymentList = () => {
    return api.getPRDeploymentList(
      "<token>",
      {},
      {
        project_id: currentProject.id,
        cluster_id: currentCluster.id,
      }
    );
    // return mockRequest();
  };

  useEffect(() => {
    const selected_repo = getQueryParam("repository");

    const repo = environments.find(
      (env) => `${env.git_repo_owner}/${env.git_repo_name}` === selected_repo
    );

    if (repo && true) {
      setSelectedRepo(`${repo.git_repo_owner}/${repo.git_repo_name}`);
    }
  }, [location.search, history]);

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
    getPRDeploymentList()
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        setDeploymentList(data.deployments || []);
        setPullRequests(data.pull_requests || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setHasError(true);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentCluster, currentProject, statusSelectorVal]);

  const handleRefresh = () => {
    setIsLoading(true);
    getPRDeploymentList()
      .then(({ data }) => {
        setDeploymentList(data.deployments || []);
        setPullRequests(data.pull_requests || []);
      })
      .catch((err) => {
        setHasError(true);
        console.error(err);
      })
      .finally(() => setIsLoading(false));
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

  const filteredDeployments = useMemo(() => {
    if (statusSelectorVal === "not_deployed") {
      return [];
    }

    if (statusSelectorVal === "all" && selectedRepo === "all") {
      return deploymentList;
    }

    let tmpDeploymentList = [...deploymentList];

    if (selectedRepo !== "all") {
      tmpDeploymentList = tmpDeploymentList.filter((deployment) => {
        return (
          `${deployment.gh_repo_owner}/${deployment.gh_repo_name}` ===
          selectedRepo
        );
      });
    }

    // Only filter out inactive when status filter is "active"
    if (statusSelectorVal === "active") {
      tmpDeploymentList = tmpDeploymentList.filter((d) => {
        return d.status !== "inactive";
      });
    } else if (statusSelectorVal === "inactive") {
      tmpDeploymentList = tmpDeploymentList.filter((d) => {
        return d.status === "inactive";
      });
    }

    return tmpDeploymentList;
  }, [selectedRepo, statusSelectorVal, deploymentList]);

  const filteredPullRequests = useMemo(() => {
    if (
      statusSelectorVal !== "not_deployed" &&
      statusSelectorVal !== "inactive"
    ) {
      return [];
    }

    if (selectedRepo === "inactive") {
      return pullRequests;
    }

    return pullRequests.filter((pr) => {
      return `${pr.repo_owner}/${pr.repo_name}` === selectedRepo;
    });
  }, [selectedRepo, pullRequests]);

  const renderDeploymentList = () => {
    if (isLoading) {
      return (
        <Placeholder>
          <Loading />
        </Placeholder>
      );
    }

    if (!deploymentList.length && !pullRequests.length) {
      return (
        <Placeholder>
          No preview apps have been found. Open a PR to create a new preview
          app.
        </Placeholder>
      );
    }

    if (!filteredDeployments.length && !filteredPullRequests.length) {
      return (
        <Placeholder>
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
            />
          );
        })}
      </>
    );
  };

  const handleStatusFilterChange = (value: string) => {
    setIsLoading(true);
    pushQueryParams({ status_filter: value });
    setStatusSelectorVal(value);
  };

  const renderMain = () => {
    return (
      <Container>
        <EventsGrid>{renderDeploymentList()}</EventsGrid>
      </Container>
    );
  };

  return (
    <>
      <Flex>
        <i
          className="material-icons"
          onClick={() => pushQueryParams({}, ["status_filter", "repository"])}
        >
          keyboard_backspace
        </i>
        <Icon
          src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png"
          alt="git repository icon"
        />
        <Title>{selectedRepo}</Title>

        <ActionsWrapper>
          <StyledStatusSelector>
            <RefreshButton color={"#7d7d81"} onClick={handleRefresh}>
              <i className="material-icons">refresh</i>
            </RefreshButton>
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
      {renderMain()}
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

const Flex = styled.div`
  display: flex;
  align-items: center;

  > i {
    cursor: pointer;
    font-size: 24px;
    color: #969fbbaa;
    padding: 3px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const Icon = styled.img`
  width: 25px;
  height: 25px;
  margin-right: 6px;
  margin-left: 14px;
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

const Placeholder = styled.div`
  padding: 30px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 40vh;
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;

const Container = styled.div`
  margin-top: 33px;
  padding-bottom: 120px;
`;

const ControlRow = styled.div`
  display: flex;
  margin-left: auto;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-left: 0px;
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

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
  width: 50%;
`;

const Subheader = styled.div`
  width: 50%;
`;

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;
