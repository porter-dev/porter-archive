import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import { useParams } from "react-router";
import { PullRequest } from "../types";
import DashboardHeader from "../../DashboardHeader";
import PullRequestIcon from "assets/pull_request_icon.svg";
import Helper from "components/form-components/Helper";
import pr_icon from "assets/pull_request_icon.svg";
import api from "shared/api";
import { EllipsisTextWrapper, RepoLink } from "../components/styled";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPRDeploymentList, validatePorterYAML } from "../utils";
import Banner from "components/Banner";
import Modal from "main/home/modals/Modal";
import { useRouting } from "shared/routing";
import PorterYAMLErrorsModal from "../components/PorterYAMLErrorsModal";
import { PlaceHolder } from "brace";
import Placeholder from "components/Placeholder";

const CreateEnvironment: React.FC = () => {
  const router = useRouting();
  const queryClient = useQueryClient();
  const [showErrorsModal, setShowErrorsModal] = useState<boolean>(false);
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const { environment_id, repo_name, repo_owner } = useParams<{
    environment_id: string;
    repo_name: string;
    repo_owner: string;
  }>();

  const { isLoading: getPullRequestsLoading, data: pullRequests } = useQuery<
    PullRequest[]
  >(
    ["pullRequests", currentProject.id, currentCluster.id, environment_id],
    async () => {
      try {
        const res = await getPRDeploymentList({
          projectID: currentProject.id,
          clusterID: currentCluster.id,
          environmentID: Number(environment_id),
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

  const selectedRepo = `${repo_owner}/${repo_name}`;

  const handlePRRowItemClick = async (pullRequest: PullRequest) => {
    setSelectedPR(pullRequest);
    setLoading(true);

    const res = await validatePorterYAML({
      projectID: currentProject.id,
      clusterID: currentCluster.id,
      environmentID: Number(environment_id),
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
        `/preview-environments/deployments/${environment_id}/${selectedPR.repo_owner}/${selectedPR.repo_name}?status_filter=all`
      );
    } catch (err) {
      setCurrentError(err);
    }
  };

  const renderPullRequestList = () => {
    return (
      <>
        <Helper>
          Select an open pull request to preview. Pull requests must contain a{" "}
          <Code>porter.yaml</Code> file.
        </Helper>
        <Br height="10px" />
        <PullRequestList>
          {(pullRequests ?? []).map((pullRequest: PullRequest, i: number) => {
            return (
              <PullRequestRow
                onClick={() => {
                  handlePRRowItemClick(pullRequest);
                }}
                isLast={i === pullRequests.length - 1}
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
                    </MergeInfoWrapper>
                  </DeploymentImageContainer>
                </Flex>
              </PullRequestRow>
            );
          })}
        </PullRequestList>
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

  return (
    <>
      <BreadcrumbRow>
        <Breadcrumb to={`/preview-environments/deployments/settings`}>
          <ArrowIcon src={PullRequestIcon} />
          <Wrap>Preview environments</Wrap>
        </Breadcrumb>
        <Slash>/</Slash>
        <Breadcrumb
          to={`/preview-environments/deployments/${environment_id}/${selectedRepo}`}
        >
          <Icon src="https://git-scm.com/images/logos/downloads/Git-Icon-1788C.png" />
          <Wrap>{selectedRepo}</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <DashboardHeader
        title="Create a preview deployment"
        disableLineBreak
        capitalize={false}
      />
      <DarkMatter />
      {pullRequests?.length ? (
        renderPullRequestList()
      ) : (
        <>
          <Br height="30px" />
          <Placeholder height="370px">
            You do not have any pull requests.
          </Placeholder>
        </>
      )}
    </>
  );
};

export default CreateEnvironment;

const PullRequestList = styled.div`
  border: 1px solid #494b4f;
  border-radius: 5px;
  overflow: hidden;
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

const Code = styled.span`
  font-family: monospace; ;
`;

const SepDot = styled.div`
  color: #aaaabb66;
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

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
  margin-left: 7px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-top: -1px;
  margin-left: 10px;
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

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -15px;
`;

const Br = styled.div<{ height: string }>`
  width: 100%;
  height: ${(props) => props.height || "2px"};
`;

const Slash = styled.div`
  margin: 0 4px;
  color: #aaaabb88;
`;

const Wrap = styled.div`
  z-index: 999;
`;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const Icon = styled.img`
  width: 15px;
  margin-right: 8px;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 15px;
  margin-top: -10px;
  align-items: center;
`;

const Breadcrumb = styled(DynamicLink)`
  color: #aaaabb88;
  font-size: 13px;
  display: flex;
  align-items: center;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const ValidationErrorBannerWrapper = styled.div`
  margin-block: 20px;
`;

const LearnMoreButton = styled.div`
  text-decoration: underline;
  fontweight: bold;
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
