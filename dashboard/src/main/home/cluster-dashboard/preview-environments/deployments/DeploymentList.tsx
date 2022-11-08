import React, { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import _ from "lodash";
import DeploymentCard from "./DeploymentCard";
import { Environment, PRDeployment, PullRequest } from "../types";
import { useRouting } from "shared/routing";
import { useHistory, useLocation, useParams } from "react-router";
import { deployments, pull_requests } from "../mocks";
import DynamicLink from "components/DynamicLink";
import DashboardHeader from "../../DashboardHeader";
import RadioFilter from "components/RadioFilter";
import Placeholder from "components/Placeholder";
import Banner from "components/Banner";

import pullRequestIcon from "assets/pull_request_icon.svg";
import filterOutline from "assets/filter-outline.svg";
import sort from "assets/sort.svg";
import { search } from "shared/search";
import { getPRDeploymentList, validatePorterYAML } from "../utils";
import { PorterYAMLErrors } from "../errors";
import PorterYAMLErrorsModal from "../components/PorterYAMLErrorsModal";

const AvailableStatusFilters = [
  "all",
  "creating",
  "created",
  "failed",
  "timed_out",
  "updating",
];

type AvailableStatusFiltersType = typeof AvailableStatusFilters[number];

const DeploymentList = () => {
  const [sortOrder, setSortOrder] = useState("Newest");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [deploymentList, setDeploymentList] = useState<PRDeployment[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [newCommentsDisabled, setNewCommentsDisabled] = useState(false);
  const [porterYAMLErrors, setPorterYAMLErrors] = useState<string[]>([]);
  const [expandedPorterYAMLErrors, setExpandedPorterYAMLErrors] = useState<
    string[]
  >([]);

  const [
    statusSelectorVal,
    setStatusSelectorVal,
  ] = useState<AvailableStatusFiltersType>("all");

  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const { getQueryParam, pushQueryParams } = useRouting();
  const location = useLocation();
  const history = useHistory();
  const { environment_id, repo_name, repo_owner } = useParams<{
    environment_id: string;
    repo_name: string;
    repo_owner: string;
  }>();

  const selectedRepo = `${repo_owner}/${repo_name}`;

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

    Promise.allSettled([
      validatePorterYAML({
        projectID: currentProject.id,
        clusterID: currentCluster.id,
        environmentID: Number(environment_id),
      }),
      getPRDeploymentList({
        projectID: currentProject.id,
        clusterID: currentCluster.id,
        environmentID: Number(environment_id),
      }),
      getEnvironment(),
    ])
      .then(
        ([
          validatePorterYAMLResponse,
          getDeploymentsResponse,
          getEnvironmentResponse,
        ]) => {
          const deploymentList =
            getDeploymentsResponse.status === "fulfilled"
              ? getDeploymentsResponse.value.data
              : {};
          const environmentList =
            getEnvironmentResponse.status === "fulfilled"
              ? getEnvironmentResponse.value.data
              : {};
          const porterYAMLErrors =
            validatePorterYAMLResponse.status === "fulfilled"
              ? validatePorterYAMLResponse.value.data.errors
              : [];

          if (!isSubscribed) {
            return;
          }

          setPorterYAMLErrors(porterYAMLErrors);
          setDeploymentList(deploymentList.deployments ?? []);
          setPullRequests(deploymentList.pull_requests || []);

          setNewCommentsDisabled(
            environmentList.new_comments_disabled || false
          );

          setIsLoading(false);
        }
      )
      .catch((err) => {
        setDeploymentList([]);
        setCurrentError(err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentCluster, currentProject, environment_id]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const { data } = await getPRDeploymentList({
        projectID: currentProject.id,
        clusterID: currentCluster.id,
        environmentID: Number(environment_id),
      });
      setDeploymentList(data.deployments ?? []);
      setPullRequests(data.pull_requests || []);
    } catch (error) {
      setHasError(true);
      console.error(error);
    }
    setIsLoading(false);
  };

  const searchFilter = (value: string | number) => {
    const val = String(value);

    return val.toLowerCase().includes(searchValue.toLowerCase());
  };

  const filteredDeployments = useMemo(() => {
    const filteredByStatus = deploymentList.filter((d) => {
      if (["deleted", "inactive"].includes(d.status)) {
        return false;
      }

      if (statusSelectorVal === "all") {
        return true;
      }

      if (d.status === statusSelectorVal) {
        return true;
      }

      return false;
    });

    const filteredBySearch = search<PRDeployment>(
      filteredByStatus,
      searchValue,
      {
        isCaseSensitive: false,
        keys: ["gh_pr_name", "gh_repo_name", "gh_repo_owner"],
      }
    );

    switch (sortOrder) {
      case "Newest":
        return _.sortBy(filteredBySearch, "updated_at").reverse();
      case "Oldest":
        return _.sortBy(filteredBySearch, "updated_at");
      case "Alphabetical":
      default:
        return _.sortBy(filteredBySearch, "gh_pr_name");
    }
  }, [statusSelectorVal, deploymentList, searchValue, sortOrder]);

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

    if (!deploymentList.length) {
      return (
        <Placeholder height="calc(100vh - 400px)">
          No preview developments have been found. Open a PR to create a new
          preview app.
        </Placeholder>
      );
    }

    if (!filteredDeployments.length) {
      return (
        <Placeholder height="calc(100vh - 400px)">
          No preview developments have been found with the given filter.
        </Placeholder>
      );
    }

    return (
      <>
        {filteredDeployments.map((d: any) => {
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

  useEffect(() => {
    pushQueryParams({ status_filter: statusSelectorVal });
  }, [statusSelectorVal]);

  return (
    <>
      <PorterYAMLErrorsModal
        errors={expandedPorterYAMLErrors}
        onClose={() => setExpandedPorterYAMLErrors([])}
        repo={selectedRepo}
      />

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
              <I className="material-icons">more_vert</I>
            </DynamicLink>
          </Flex>
        }
        description={`Preview environments for the ${selectedRepo} repository.`}
        disableLineBreak
        capitalize={false}
      />
      {porterYAMLErrors.length > 0 ? (
        <PorterYAMLBannerWrapper>
          <Banner type="warning">
            We found some errors in the porter.yaml file in the default branch.
            <LinkButton
              onClick={() => {
                setExpandedPorterYAMLErrors(porterYAMLErrors);
              }}
            >
              Learn more
            </LinkButton>
          </Banner>
        </PorterYAMLBannerWrapper>
      ) : null}
      <FlexRow>
        <Flex>
          <SearchRowWrapper>
            <SearchBarWrapper>
              <i className="material-icons">search</i>
              <SearchInput
                value={searchValue}
                onChange={(e: any) => {
                  setSearchValue(e.target.value);
                }}
                placeholder="Search"
              />
            </SearchBarWrapper>
          </SearchRowWrapper>
          <RadioFilter
            icon={filterOutline}
            selected={statusSelectorVal}
            setSelected={setStatusSelectorVal}
            options={AvailableStatusFilters.map((filter) => ({
              value: filter,
              label: _.startCase(filter),
            }))}
            name="Status"
          />
        </Flex>
        <Flex>
          <RefreshButton color={"#7d7d81"} onClick={handleRefresh}>
            <i className="material-icons">refresh</i>
          </RefreshButton>
          <RadioFilter
            icon={sort}
            selected={sortOrder}
            setSelected={setSortOrder}
            options={[
              { label: "Newest", value: "Newest" },
              { label: "Oldest", value: "Oldest" },
              { label: "Alphabetical", value: "Alphabetical" },
            ]}
            name="Sort"
          />
          <CreatePreviewEnvironmentButton
            disabled={porterYAMLErrors.some(
              (err) => err === PorterYAMLErrors.FileNotFound
            )}
            to={`/preview-environments/deployments/${environment_id}/${repo_owner}/${repo_name}/create`}
          >
            <i className="material-icons">add</i> New preview deployment
          </CreatePreviewEnvironmentButton>
        </Flex>
      </FlexRow>
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

const LinkButton = styled.a`
  text-decoration: underline;
  margin-left: 7px;
  cursor: pointer;
`;

const Message = styled.div`
  padding: 20px;
  background: #26292e;
  border-radius: 5px;
  line-height: 1.5em;
  border: 1px solid #aaaabb33;
  font-size: 13px;
  margin-top: 40px;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  margin-top: 5px;
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

const SearchInput = styled.input`
  outline: none;
  border: none;
  font-size: 13px;
  background: none;
  width: 100%;
  color: white;
  height: 100%;
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  height: 30px;
  margin-right: 10px;
  background: #26292e;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
`;

const SearchRowWrapper = styled(SearchRow)`
  border-radius: 5px;
  width: 250px;
`;

const SearchBarWrapper = styled.div`
  display: flex;
  flex: 1;

  > i {
    color: #aaaabb;
    padding-top: 1px;
    margin-left: 8px;
    font-size: 16px;
    margin-right: 8px;
  }
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const CreatePreviewEnvironmentButton = styled(DynamicLink)`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 10px;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  font-weight: 500;
  color: white;
  height: 30px;
  padding: 0 8px;
  min-width: 155px;
  padding-right: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
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

const PorterYAMLBannerWrapper = styled.div`
  margin-block: 15px;
`;
