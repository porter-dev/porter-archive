import React, { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { DeploymentStatus, PRDeployment } from "../types";
import pr_icon from "assets/pull_request_icon.svg";
import DynamicLink from "components/DynamicLink";
import { capitalize, readableDate } from "shared/string_utils";
import api from "shared/api";
import { useContext } from "react";
import { Context } from "shared/Context";
import Loading from "components/Loading";
import { ActionButton } from "../components/ActionButton";
import { EllipsisTextWrapper, RepoLink } from "../components/styled";
import MaterialTooltip from "@material-ui/core/Tooltip";
import _ from "lodash";

interface DeploymentCardAction {
  active: boolean;
  label: string;
  action: (...args: any) => void;
}

interface DeploymentCardActionsDropdownProps {
  options: DeploymentCardAction[];
}

const DeploymentCardActionsDropdown = ({
  options,
}: DeploymentCardActionsDropdownProps) => {
  const wrapperRef = useRef<HTMLDivElement>();
  const [expanded, setExpanded] = useState(false);

  const handleOutsideClick = (event: any) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
      setExpanded(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick.bind(this));

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick.bind(this));
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <I
        className="material-icons"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((expanded) => !expanded);
        }}
      >
        more_vert
      </I>
      <ActionsDropdownWrapper expanded={expanded}>
        <ActionsDropdown ref={wrapperRef}>
          {options.length ? (
            <ActionsScrollableWrapper>
              {options
                .filter((option) => option.active)
                .map(({ label, action }, idx) => {
                  return (
                    <ActionsRow
                      isLast={idx === options.length - 1}
                      onClick={action}
                      key={label}
                    >
                      <ActionsRowText>{label}</ActionsRowText>
                    </ActionsRow>
                  );
                })}
            </ActionsScrollableWrapper>
          ) : null}
        </ActionsDropdown>
      </ActionsDropdownWrapper>
    </div>
  );
};

const DeploymentCard: React.FC<{
  deployment: PRDeployment;
  onDelete: () => void;
  onReEnable: () => void;
  onReRun: () => void;
}> = ({ deployment, onDelete, onReEnable, onReRun }) => {
  const {
    setCurrentOverlay,
    currentProject,
    currentCluster,
    setCurrentError,
  } = useContext(Context);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasErrorOnReEnabling, setHasErrorOnReEnabling] = useState(false);
  const [showMergeInfoTooltip, setShowMergeInfoTooltip] = useState(false);
  const [isReRunningWorkflow, setIsReRunningWorkflow] = useState(false);
  const [hasErrorOnReRun, setHasErrorOnReRun] = useState(false);

  const deleteDeployment = () => {
    setIsDeleting(true);

    api
      .deletePRDeployment(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          deployment_id: deployment.id,
        }
      )
      .then(() => {
        setIsDeleting(false);
        onDelete();
        setCurrentOverlay(null);
      });
  };

  const reEnablePreviewEnvironment = async () => {
    setIsLoading(true);
    try {
      await api.reenablePreviewEnvironmentDeployment(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          deployment_id: deployment.id,
        }
      );

      setIsLoading(false);
      onReEnable();
    } catch (err) {
      setHasErrorOnReEnabling(true);
      setIsLoading(false);
      setCurrentError(err?.response?.data?.error || err);
      setTimeout(() => {
        setHasErrorOnReEnabling(false);
      }, 500);
    }
  };

  const reRunWorkflow = async () => {
    setIsReRunningWorkflow(true);
    try {
      await api.triggerPreviewEnvWorkflow(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          deployment_id: deployment.id,
        }
      );
      setIsReRunningWorkflow(false);
      onReEnable();
    } catch (error) {
      setHasErrorOnReRun(true);
      setIsReRunningWorkflow(false);
      setCurrentError(error);
      setTimeout(() => {
        setHasErrorOnReRun(false);
      }, 500);
    }
  };

  const DeploymentCardActions = [
    {
      active: !!deployment.last_workflow_run_url,
      label: "View last workflow",
      action: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(deployment.last_workflow_run_url, "_blank");
      },
    },
    {
      active: true,
      label: "Delete",
      action: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        deleteDeployment();
      },
    },
  ];

  return (
    <DeploymentCardWrapper
      to={`/preview-environments/details/${deployment.id}?environment_id=${deployment.environment_id}`}
    >
      <DataContainer>
        <PRName>
          <PRIcon src={pr_icon} alt="pull request icon" />
          <EllipsisTextWrapper tooltipText={deployment.gh_pr_name}>
            <StyledLink
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(
                  `https://github.com/${deployment.gh_repo_owner}/${deployment.gh_repo_name}/pull/${deployment.pull_request_id}`,
                  "_blank"
                );
              }}
              to={`https://github.com/${deployment.gh_repo_owner}/${deployment.gh_repo_name}/pull/${deployment.pull_request_id}`}
              target="_blank"
            >
              {deployment.gh_pr_name}
            </StyledLink>
          </EllipsisTextWrapper>
          {deployment.gh_pr_branch_from && deployment.gh_pr_branch_into ? (
            <MergeInfoWrapper>
              <MergeInfo
                onMouseOver={() => setShowMergeInfoTooltip(true)}
                onMouseOut={() => setShowMergeInfoTooltip(false)}
              >
                {deployment.gh_pr_branch_from}
                <i className="material-icons">arrow_forward</i>
                {deployment.gh_pr_branch_into}
              </MergeInfo>
              {showMergeInfoTooltip && (
                <Tooltip>
                  {deployment.gh_pr_branch_from} {"->"}{" "}
                  {deployment.gh_pr_branch_into}
                </Tooltip>
              )}
            </MergeInfoWrapper>
          ) : null}
        </PRName>

        <Flex>
          <StatusContainer>
            <Status>
              <StatusDot status={deployment.status} />
              {capitalize(deployment.status)}
            </Status>
          </StatusContainer>
          <DeploymentImageContainer>
            <InfoWrapper>
              <SepDot>•</SepDot>
              <LastDeployed>
                Last updated {readableDate(deployment.updated_at)}
              </LastDeployed>
            </InfoWrapper>
          </DeploymentImageContainer>
        </Flex>
      </DataContainer>
      <Flex>
        {!isDeleting ? (
          <>
            {deployment.status === DeploymentStatus.Failed ||
            deployment.status === DeploymentStatus.TimedOut ? (
              <>
                <MaterialTooltip title="Re run last github workflow">
                  <ReRunButton
                    onClick={() => reRunWorkflow()}
                    disabled={isReRunningWorkflow}
                    hasError={hasErrorOnReRun}
                  >
                    <i className="material-icons-outlined">loop</i>
                  </ReRunButton>
                </MaterialTooltip>
              </>
            ) : null}

            {deployment.status !== DeploymentStatus.Creating && (
              <>
                {deployment.subdomain &&
                deployment.status === DeploymentStatus.Created ? (
                  <RowButton
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      window.open(deployment.subdomain, "_blank");
                    }}
                    key={deployment.subdomain}
                  >
                    <i className="material-icons">open_in_new</i>
                    View Live
                  </RowButton>
                ) : null}
                <DeploymentCardActionsDropdown
                  options={DeploymentCardActions}
                />
              </>
            )}
            {/* <Button
              onClick={() => {
                setCurrentOverlay({
                  message: `Are you sure you want to delete this deployment?`,
                  onYes: deleteDeployment,
                  onNo: () => setCurrentOverlay(null),
                });
              }}
            >
              <i className="material-icons">delete</i>
              Delete
            </Button> */}
          </>
        ) : (
          <DeleteMessage>
            Deleting
            <Dot delay="0s" />
            <Dot delay="0.1s" />
            <Dot delay="0.2s" />
          </DeleteMessage>
        )}
      </Flex>
    </DeploymentCardWrapper>
  );
};

export default DeploymentCard;

const ReRunButton = styled(ActionButton)`
  min-width: unset;

  > i {
    margin-right: unset;
  }
`;

const SepDot = styled.div`
  color: #aaaabb66;
`;

const DeleteMessage = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

export const DissapearAnimation = keyframes`
  0% {
    background-color: #ffffff;
  }

  25% {
    background-color: #ffffff50;
  }

  50% {
    background-color: none;
  }

  75% {
    background-color: #ffffff50;
  }

  100% {
    background-color: #ffffff;
  }
`;

const Dot = styled.div`
  background-color: black;
  border-radius: 50%;
  width: 5px;
  height: 5px;
  margin: 0 0.25rem;
  margin-bottom: 2px;
  //Animation
  animation: ${DissapearAnimation} 0.5s linear infinite;
  animation-delay: ${(props: { delay: string }) => props.delay};
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
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

const DeploymentCardWrapper = styled(DynamicLink)`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  height: 75px;
  padding: 12px;
  padding-left: 14px;
  border-radius: 5px;
  background: #26292e;
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

const RowButton = styled.button`
  white-space: nowrap;
  font-size: 12px;
  padding: 8px 10px;
  margin-left: 10px;
  border-radius: 5px;
  color: #ffffff;
  border: 1px solid #aaaabb;
  display: flex;
  align-items: center;
  background: #ffffff08;
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }

  > i {
    font-size: 14px;
    margin-right: 8px;
  }
`;

const Button = styled.div`
  font-size: 12px;
  padding: 8px 10px;
  margin-left: 10px;
  border-radius: 5px;
  color: #ffffff;
  border: 1px solid #aaaabb;
  display: flex;
  align-items: center;
  background: #ffffff08;
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }

  > i {
    font-size: 14px;
    margin-right: 8px;
  }
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
  background: ${(props: { status: string }) =>
    props.status === "created"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
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
  left: -20px;
  top: 10px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
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

const I = styled.i`
  user-select: none;
  margin-left: 15px;
  color: #aaaabb;
  cursor: pointer;
  border-radius: 40px;
  font-size: 18px;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover {
    background: #26292e;
    border: 1px solid #494b4f;
  }
`;

const ActionsDropdown = styled.div`
  width: 150px;
  border-radius: 3px;
  z-index: 999;
  overflow-y: auto;
  background: #2f3135;
  padding: 0;
  border-radius: 5px;
  border: 1px solid #aaaabb33;
`;

const ActionsDropdownWrapper = styled.div<{ expanded: boolean }>`
  display: ${(props) => (props.expanded ? "block" : "none")};
  position: absolute;
  right: calc(-100%);
  z-index: 1;
  top: calc(100% + 5px);
`;

const ActionsScrollableWrapper = styled.div`
  overflow-y: auto;
  max-height: 350px;
`;

const ActionsRow = styled.div<{ isLast: boolean; selected?: boolean }>`
  width: 100%;
  height: 35px;
  padding-left: 10px;
  display: flex;
  cursor: pointer;
  align-items: center;
  font-size: 13px;
  background: ${(props) => (props.selected ? "#ffffff11" : "")};

  :hover {
    background: #ffffff18;
  }
`;

const ActionsRowText = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  word-break: anywhere;
  margin-right: 10px;
  color: white;
`;

const StyledLink = styled(DynamicLink)`
  color: white;
  :hover {
    text-decoration: underline;
  }
`;
