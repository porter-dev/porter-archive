import React, { MouseEvent, useContext, useState } from "react";
import styled from "styled-components";
import { Context } from "shared/Context";
import _ from "lodash";

import api from "shared/api";
import DynamicLink from "components/DynamicLink";
import { readableDate } from "shared/string_utils";
import { isRunning, renderStatus } from "./ExpandedJobRun";
import { usePods } from "shared/hooks/usePods";

type Props = {
  job: any;
  handleDelete: () => void;
  deleting: boolean;
  readOnly?: boolean;
  expandJob: any;
  currentChartVersion: number;
  latestChartVersion: number;
  isDeployedFromGithub: boolean;
  repositoryUrl?: string;
};

const JobResource: React.FC<Props> = (props) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  const [showConnectionModal, setShowConnectionModal] = useState(false);

  const [pods, isLoading] = usePods({
    project_id: currentProject.id,
    cluster_id: currentCluster.id,
    namespace: props.job.metadata?.namespace,
    selectors: [`job-name=${props.job.metadata?.name}`],
    controller_kind: "job",
    controller_name: props.job.metadata?.name,
    subscribed: props.job?.status.active,
  });

  const stopJob = (event: MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    api
      .stopJob(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: props.job.metadata?.name,
          namespace: props.job.metadata?.namespace,
          cluster_id: currentCluster.id,
        }
      )
      .then(() => {})
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;
        if (parsedErr) {
          err = parsedErr;
        }
        setCurrentError(err);
      });
  };

  const getCompletedReason = () => {
    let completeCondition: any;

    // get the completed reason from the status
    props.job.status?.conditions?.forEach((condition: any) => {
      if (condition.type == "Complete") {
        completeCondition = condition;
      }
    });

    if (!completeCondition) {
      // otherwise look for a failed reason
      props.job.status?.conditions?.forEach((condition: any) => {
        if (condition.type == "Failed") {
          completeCondition = condition;
        }
      });
    }

    // if still no complete condition, return unknown
    if (!completeCondition) {
      return "Succeeded";
    }

    return (
      completeCondition?.reason ||
      `Completed at ${readableDate(completeCondition?.lastTransitionTime)}`
    );
  };

  const getFailedReason = () => {
    let failedCondition: any;

    // get the completed reason from the status
    props.job.status?.conditions?.forEach((condition: any) => {
      if (condition.type == "Failed") {
        failedCondition = condition;
      }
    });

    return failedCondition
      ? `Failed at ${readableDate(failedCondition.lastTransitionTime)}`
      : "Failed";
  };

  const getSubtitle = () => {
    if (props.job.status?.succeeded >= 1) {
      return getCompletedReason();
    }

    if (props.job.status?.failed >= 1) {
      return getFailedReason();
    }

    return "Running";
  };

  const renderStopButton = () => {
    if (props.readOnly) {
      return null;
    }

    if (isRunning(props.deleting, props.job, pods[0])) {
      return (
        <i className="material-icons" onClick={stopJob}>
          stop
        </i>
      );
    }

    return null;
  };

  const getImageTag = () => {
    const container = props.job?.spec?.template?.spec?.containers[0];
    const tag = container?.image?.split(":")[1];

    if (!tag) {
      return "unknown";
    }

    if (props.isDeployedFromGithub && tag !== "latest") {
      return (
        <DynamicLink
          to={`https://github.com/${props.repositoryUrl}/commit/${tag}`}
          onClick={(e) => e.preventDefault()}
          target="_blank"
        >
          {tag}
        </DynamicLink>
      );
    }

    return tag;
  };

  const getRevisionNumber = () => {
    const revision = props.job?.metadata?.labels["helm.sh/revision"];
    let status: RevisionContainerProps["status"] = "current";
    if (props.currentChartVersion > revision) {
      status = "outdated";
    }
    return (
      <RevisionContainer status={status}>
        Revision No - {revision || "unknown"}
      </RevisionContainer>
    );
  };

  const icon =
    "https://user-images.githubusercontent.com/65516095/111258413-4e2c3800-85f3-11eb-8a6a-88e03460f8fe.png";
  const commandString = props.job?.spec?.template?.spec?.containers[0]?.command?.join(
    " "
  );

  return (
    <>
      <StyledJob>
        <MainRow onClick={() => props.expandJob(props.job)}>
          <Flex>
            <Icon src={icon && icon} />
            <Description>
              <Label>
                Started at {readableDate(props.job.status?.startTime)}
                <Dot>•</Dot>
                <span>
                  {props.isDeployedFromGithub ? "Commit: " : "Image tag:"}{" "}
                  {getImageTag()}
                </span>
              </Label>
              <Subtitle>{getSubtitle()}</Subtitle>
            </Description>
          </Flex>
          <EndWrapper>
            <Flex>
              {getRevisionNumber()}
              <CommandString>{commandString}</CommandString>
            </Flex>

            {renderStatus(props.deleting, props.job, pods[0])}
            <MaterialIconTray disabled={false}>
              {renderStopButton()}
              {!props.readOnly && (
                <i
                  className="material-icons"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.handleDelete();
                  }}
                >
                  delete
                </i>
              )}
            </MaterialIconTray>
          </EndWrapper>
        </MainRow>
      </StyledJob>
    </>
  );
};

export default JobResource;

type RevisionContainerProps = {
  status: "outdated" | "current";
};

const RevisionContainer = styled.span<RevisionContainerProps>`
  margin-right: 15px;
  ${({ status }) => {
    if (status === "outdated") {
      return "color: rgb(245, 203, 66);";
    }
    return "";
  }}
`;

const Dot = styled.div`
  margin-right: 9px;
  margin-left: 9px;
  color: #ffffff88;
`;

const CommandString = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  color: #ffffff55;
  margin-right: 27px;
  font-family: monospace;
`;

const EndWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Icon = styled.img`
  width: 30px;
  margin-right: 18px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledJob = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  overflow: hidden;
  border-radius: 5px;
  background: #26292e;
  border: 1px solid #494b4f;
  :hover {
    border: 1px solid #7a7b80;
  }
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  padding-right: 18px;
  border-radius: 5px;
`;

const MaterialIconTray = styled.div`
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    margin: 0 5px;
    color: #ffffff44;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Description = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
`;

const Label = styled.div`
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  > span {
    color: #ffffff88;
  }
`;

const Subtitle = styled.div`
  color: #aaaabb;
  font-size: 13px;
  display: flex;
  align-items: center;
  padding-top: 5px;
`;
