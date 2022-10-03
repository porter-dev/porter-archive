import React, { useState, useContext } from "react";
import styled from "styled-components";
import pr_icon from "assets/pull_request_icon.svg";
import { PullRequest } from "../types";
import { integrationList } from "shared/common";
import api from "shared/api";
import { Context } from "shared/Context";
import { ActionButton } from "../components/ActionButton";
import Loading from "components/Loading";
import DynamicLink from "components/DynamicLink";
import RecreateWorkflowFilesModal from "../components/RecreateWorkflowFilesModal";
import { EllipsisTextWrapper, RepoLink } from "../components/styled";

const PullRequestCard = ({
  pullRequest,
  onCreation,
}: {
  pullRequest: PullRequest;
  onCreation: (pullRequest: PullRequest) => void;
}) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [showMergeInfoTooltip, setShowMergeInfoTooltip] = useState(false);
  const [
    openRecreateWorkflowFilesModal,
    setOpenRecreateWorkflowFilesModal,
  ] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const createPreviewEnvironment = async () => {
    setIsLoading(true);
    try {
      await api.createPreviewEnvironmentDeployment("<token>", pullRequest, {
        cluster_id: currentCluster?.id,
        project_id: currentProject?.id,
      });
      onCreation(pullRequest);
    } catch (error) {
      setCurrentError(error?.response?.data?.error || error);
      setHasError(true);
      setTimeout(() => {
        setHasError(false);
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <RecreateWorkflowFilesModal
        hide={!openRecreateWorkflowFilesModal}
        onClose={() => setOpenRecreateWorkflowFilesModal(false)}
        isReEnable={false}
      />
      <DeploymentCardWrapper>
        <DataContainer>
          <PRName>
            <PRIcon src={pr_icon} alt="pull request icon" />
            <EllipsisTextWrapper tooltipText={pullRequest.pr_title}>
              {pullRequest.pr_title}
            </EllipsisTextWrapper>
            <InfoWrapper>
              <MergeInfo
                onMouseOver={() => setShowMergeInfoTooltip(true)}
                onMouseOut={() => setShowMergeInfoTooltip(false)}
              >
                {pullRequest.branch_from}
                <i className="material-icons">arrow_forward</i>
                {pullRequest.branch_into}
              </MergeInfo>
              {showMergeInfoTooltip && (
                <Tooltip>
                  From: {pullRequest.branch_from} Into:{" "}
                  {pullRequest.branch_into}
                </Tooltip>
              )}
            </InfoWrapper>
            <RepoLink
              to={`https://github.com/${pullRequest.repo_owner}/${pullRequest.repo_name}/pull/${pullRequest.pr_number}`}
              target="_blank"
            >
              <i className="material-icons">open_in_new</i>
              View PR
            </RepoLink>
          </PRName>

          <Flex>
            <StatusContainer>
              <Status>
                <StatusDot />
                Not deployed
              </Status>
            </StatusContainer>
          </Flex>
        </DataContainer>
        <Flex>
          <ActionButton
            onClick={createPreviewEnvironment}
            disabled={isLoading}
            hasError={hasError}
          >
            {isLoading ? (
              <Loading width="198px" height="14px" />
            ) : (
              <>
                <i className="material-icons">play_arrow</i>
                Activate Preview Environment
              </>
            )}
          </ActionButton>
        </Flex>
      </DeploymentCardWrapper>
    </>
  );
};

export default PullRequestCard;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const PRName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const DeploymentCardWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  height: 75px;
  padding: 12px;
  padding-left: 14px;
  border-radius: 5px;
  background: #262a30;
  border: 1px solid #494b4f;

  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const DataContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const StatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
`;

const PRIcon = styled.img`
  font-size: 20px;
  height: 17px;
  margin-right: 10px;
  color: #aaaabb;
  opacity: 50%;
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  min-height: 17px;
  color: #a7a6bb;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  margin-right: 10px;
  background: #ffffff88;
  border-radius: 20px;
  margin-left: 3px;
`;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  margin-left: 15px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  padding-left: 5px;
`;

const Icon = styled.img`
  width: 100%;
`;

const DeploymentTypeIcon = styled(Icon)`
  width: 20px;
  margin-right: 10px;
`;

const RepositoryName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 390px;
  position: relative;
  margin-right: 3px;
`;

const Tooltip = styled.div`
  position: absolute;
  left: 14px;
  top: 20px;
  min-height: 18px;
  max-width: calc(700px);
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  color: white;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 8px;
  position: relative;
`;

const MergeInfo = styled.div`
  font-size: 13px;
  margin-left: 14px;
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
