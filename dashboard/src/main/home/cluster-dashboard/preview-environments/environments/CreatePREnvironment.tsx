import React, { useContext, useMemo, useState } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import { PullRequest } from "../types";
import Helper from "components/form-components/Helper";
import pr_icon from "assets/pull_request_icon.svg";
import api from "shared/api";
import { EllipsisTextWrapper } from "../components/styled";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPRDeploymentList, validatePorterYAML } from "../utils";
import Banner from "components/Banner";
import { useRouting } from "shared/routing";
import PorterYAMLErrorsModal from "../components/PorterYAMLErrorsModal";
import Placeholder from "components/Placeholder";
import RadioFilter from "components/RadioFilter";

import sort from "assets/sort.svg";
import { search } from "shared/search";
import _ from "lodash";
import { readableDate } from "shared/string_utils";
import dayjs from "dayjs";
import Loading from "components/Loading";

interface Props {
  environmentID: string;
}

const CreatePREnvironment = ({ environmentID }: Props) => {
  const queryClient = useQueryClient();
  const router = useRouting();
  const [searchValue, setSearchValue] = useState("");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [showErrorsModal, setShowErrorsModal] = useState<boolean>(false);
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  // Get all PRs for the current environment
  const { isLoading: pullRequestsLoading, data: pullRequests } = useQuery<
    PullRequest[]
  >(
    ["pullRequests", currentProject.id, currentCluster.id, environmentID],
    async () => {
      try {
        const res = await getPRDeploymentList({
          projectID: currentProject.id,
          clusterID: currentCluster.id,
          environmentID: Number(environmentID),
        });

        return res.data.pull_requests || [];
      } catch (err) {
        setCurrentError(err);
      }
    }
  );

  const [selectedPR, setSelectedPR] = useState<PullRequest>();
  const [loading, setLoading] = useState(false);
  const [porterYAMLErrors, setPorterYAMLErrors] = useState<string[]>([]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["pullRequests"],
    });
  };

  const handlePRRowItemClick = async (pullRequest: PullRequest) => {
    setSelectedPR(pullRequest);
    setLoading(true);

    const res = await validatePorterYAML({
      projectID: currentProject.id,
      clusterID: currentCluster.id,
      environmentID: Number(environmentID),
      branch: pullRequest.branch_from,
    });

    setPorterYAMLErrors(res.data.errors ?? []);

    setLoading(false);
  };

  const handleCreatePreviewDeployment = async () => {
    try {
      await api.createPreviewEnvironmentDeployment("<token>", selectedPR, {
        cluster_id: currentCluster?.id,
        project_id: currentProject?.id,
      });

      router.push(
        `/preview-environments/deployments/${environmentID}/${selectedPR.repo_owner}/${selectedPR.repo_name}?status_filter=all`
      );
    } catch (err) {
      setCurrentError(err);
    }
  };

  const filteredPullRequests = useMemo(() => {
    const filteredBySearch = search<PullRequest>(
      pullRequests ?? [],
      searchValue,
      {
        isCaseSensitive: false,
        keys: ["pr_title", "branch_from", "branch_into"],
      }
    );

    switch (sortOrder) {
      case "Recently Updated":
        return _.sortBy(filteredBySearch, "updated_at").reverse();
      case "Newest":
        return _.sortBy(filteredBySearch, "created_at").reverse();
      case "Oldest":
        return _.sortBy(filteredBySearch, "created_at");
      case "Alphabetical":
      default:
        return _.sortBy(filteredBySearch, "gh_pr_name");
    }
  }, [pullRequests, searchValue, sortOrder]);

  if (pullRequestsLoading) {
    return (
      <>
        <Br height="30px" />
        <Placeholder minHeight="50vh">
          <Loading />
        </Placeholder>
      </>
    );
  }

  if (!pullRequests.length) {
    return (
      <>
        <Br height="30px" />
        <Placeholder height="50vh">{`You do not have any pull requests.`}</Placeholder>
      </>
    );
  }

  return (
    <>
      <Helper>
        Select an open pull request to preview. Pull requests must contain a{" "}
        <Code>porter.yaml</Code> file.
      </Helper>
      <FlexRow>
        <Flex>
          <SearchRowWrapper>
            <SearchBarWrapper>
              <i className="material-icons">search</i>
              <SearchInput
                value={searchValue}
                onChange={(e: any) => {
                  setSelectedPR(undefined);
                  setPorterYAMLErrors([])
                  setSearchValue(e.target.value);
                }}
                placeholder="Search"
              />
            </SearchBarWrapper>
          </SearchRowWrapper>
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
              { label: "Recently Updated", value: "Recently Updated" },
              { label: "Newest", value: "Newest" },
              { label: "Oldest", value: "Oldest" },
              { label: "Alphabetical", value: "Alphabetical" },
            ]}
            name="Sort"
          />
        </Flex>
      </FlexRow>
      <Br height="10px" />
      {filteredPullRequests?.length ? (
        <PullRequestList>
          {(filteredPullRequests ?? []).map(
            (pullRequest: PullRequest, i: number) => {
              return (
                <PullRequestRow
                  onClick={() => {
                    handlePRRowItemClick(pullRequest);
                  }}
                  isLast={i === filteredPullRequests.length - 1}
                  isSelected={pullRequest === selectedPR}
                >
                  <PRName>
                    <PRIcon src={pr_icon} alt="pull request icon" />
                    <EllipsisTextWrapper tooltipText={pullRequest.pr_title}>
                      {pullRequest.pr_title}
                    </EllipsisTextWrapper>
                  </PRName>

                  <Flex>
                    <DeploymentImageContainer>
                      {/* <InfoWrapper>
                  <LastDeployed>
                    #{pullRequest.pr_number} last updated xyz
                  </LastDeployed>
                </InfoWrapper>
                <SepDot>•</SepDot> */}
                      <MergeInfoWrapper>
                        <MergeInfo>
                          {pullRequest.branch_from}
                          <i className="material-icons">arrow_forward</i>
                          {pullRequest.branch_into}
                        </MergeInfo>
                        <SepDot>•</SepDot>
                        <LastDeployed>
                          Last updated{" "}
                          {dayjs(pullRequest.updated_at).format(
                            "hh:mma on MM/DD/YYYY"
                          )}
                        </LastDeployed>
                      </MergeInfoWrapper>
                    </DeploymentImageContainer>
                  </Flex>
                </PullRequestRow>
              );
            }
          )}
        </PullRequestList>
      ) : (
        <>
          <Br height="30px" />
          <Placeholder height="50vh">{`No pull requests match your search query.`}</Placeholder>
        </>
      )}
      {showErrorsModal && selectedPR ? (
        <PorterYAMLErrorsModal
          errors={porterYAMLErrors}
          onClose={() => setShowErrorsModal(false)}
          repo={selectedPR.repo_owner + "/" + selectedPR.repo_name}
          branch={selectedPR.branch_from}
        />
      ) : null}
      {selectedPR && porterYAMLErrors.length ? (
        <ValidationErrorBannerWrapper>
          <Banner type="warning">
            We found some errors in the porter.yaml file in the&nbsp;
            {selectedPR.branch_from}&nbsp;branch. &nbsp;
            <LearnMoreButton onClick={() => setShowErrorsModal(true)}>
              Learn more
            </LearnMoreButton>
          </Banner>
        </ValidationErrorBannerWrapper>
      ) : null}
      <CreatePreviewDeploymentWrapper>
        <SubmitButton
          onClick={handleCreatePreviewDeployment}
          disabled={loading || !selectedPR || porterYAMLErrors.length > 0}
        >
          Create preview deployment
        </SubmitButton>
        {selectedPR && porterYAMLErrors.length ? (
          <RevalidatePorterYAMLSpanWrapper>
            Please fix your porter.yaml file to continue.{" "}
            <RevalidateSpan
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!selectedPR) {
                  return;
                }

                handlePRRowItemClick(selectedPR);
              }}
            >
              Refresh
            </RevalidateSpan>
          </RevalidatePorterYAMLSpanWrapper>
        ) : null}
      </CreatePreviewDeploymentWrapper>
    </>
  );
};

export default CreatePREnvironment;

const PullRequestList = styled.div`
  border: 1px solid #494b4f;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 33px;
`;

const PullRequestRow = styled.div<{ isLast?: boolean; isSelected?: boolean }>`
  width: 100%;
  padding: 15px;
  cursor: pointer;
  background: ${(props) => (props.isSelected ? "#ffffff11" : "#26292e")};
  border-bottom: ${(props) => (props.isLast ? "" : "1px solid #494b4f")};
  :hover {
    background: #ffffff11;
  }
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
`;

const Code = styled.span`
  font-family: monospace; ;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  padding-left: 10px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const MergeInfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 8px;
  position: relative;
  margin-left: 10px;
  gap: 8px;
`;

const MergeInfo = styled.div`
  font-size: 13px;
  align-items: center;
  color: #aaaabb66;
  white-space: nowrap;
  display: flex;
  align-items: center;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 300px;

  > i {
    font-size: 16px;
    margin: 0 2px;
  }
`;

const SepDot = styled.div`
  color: #aaaabb66;
`;

const PRIcon = styled.img`
  font-size: 20px;
  height: 16px;
  margin-right: 10px;
  color: #aaaabb;
  opacity: 50%;
`;

const PRName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  font-size: 14px;
  align-items: center;
  margin-bottom: 10px;
`;

const SubmitButton = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border-radius: 5px;
  font-weight: 500;
  color: white;
  height: 30px;
  padding: 0 8px;
  width: 200px;
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

const Br = styled.div<{ height: string }>`
  width: 100%;
  height: ${(props) => props.height || "2px"};
`;

const ValidationErrorBannerWrapper = styled.div`
  margin-block: 20px;
`;

const LearnMoreButton = styled.div`
  text-decoration: underline;
  fontweight: bold;
  cursor: pointer;
`;

const CreatePreviewDeploymentWrapper = styled.div`
  margin-top: 30px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const RevalidatePorterYAMLSpanWrapper = styled.div`
  font-size: 13px;
  color: #aaaabb;
`;

const RevalidateSpan = styled.span`
  color: #aaaabb;
  text-decoration: underline;
  cursor: pointer;
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
