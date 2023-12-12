import React, { useCallback, useMemo, useState } from "react";
import AnimateHeight from "react-animate-height";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Icon from "components/porter/Icon";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Tag from "components/porter/Tag";
import Text from "components/porter/Text";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { useRevisionList } from "lib/hooks/useRevisionList";
import { isClientRevisionNotification } from "lib/porter-apps/notification";

import api from "shared/api";
import alert from "assets/alert-warning.svg";
import deploy from "assets/deploy.png";
import view_changes from "assets/edit-contained.svg";
import revert from "assets/fast-backward.svg";
import pull_request_icon from "assets/pull_request_icon.svg";
import run_for from "assets/run_for.png";
import tag_icon from "assets/tag.png";

import RevisionDiffModal from "../modals/RevisionDiffModal";
import { type PorterAppDeployEvent } from "../types";
import { getDuration, getStatusColor, getStatusIcon } from "../utils";
import { CommitIcon, ImageTagContainer, StyledEventCard } from "./EventCard";
import { RevertModal } from "./RevertModal";
import ServiceStatusDetail from "./ServiceStatusDetail";

type Props = {
  event: PorterAppDeployEvent;
  appName: string;
  showServiceStatusDetail?: boolean;
  deploymentTargetId: string;
  projectId: number;
  clusterId: number;
  gitCommitUrl: string;
  displayCommitSha: string;
};

const DeployEventCard: React.FC<Props> = ({
  event,
  appName,
  deploymentTargetId,
  projectId,
  clusterId,
  showServiceStatusDetail = false,
  gitCommitUrl,
  displayCommitSha,
}) => {
  const [diffModalVisible, setDiffModalVisible] = useState(false);
  const [revertData, setRevertData] = useState<{
    revisionNumber: number;
    id: string;
  } | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [serviceStatusVisible, setServiceStatusVisible] = useState(
    showServiceStatusDetail
  );

  const { revisionIdToNumber, numberToRevisionId } = useRevisionList({
    appName,
    deploymentTargetId,
    projectId,
    clusterId,
  });
  const { latestRevision, porterApp, latestClientNotifications } =
    useLatestRevision();

  const isRevertable = useMemo(() => {
    const latestRevisionNumber = revisionIdToNumber[latestRevision.id];
    const prevRevisionNumber =
      revisionIdToNumber[event.metadata.app_revision_id];

    if (latestRevisionNumber == null || prevRevisionNumber == null) {
      return false;
    }
    if (prevRevisionNumber === 0) {
      return false;
    }
    if (prevRevisionNumber === latestRevisionNumber) {
      return false;
    }

    const serviceDeploymentStatuses = Object.values(
      event.metadata.service_deployment_metadata ?? {}
    ).map((s) => s.status);

    return serviceDeploymentStatuses.every(
      (s) => s === "SUCCESS" || s === "CANCELED"
    );
  }, [
    latestRevision.id,
    event.metadata.app_revision_id,
    event.metadata.service_deployment_metadata,
    revisionIdToNumber,
  ]);

  const revisionNotificationsExist = useMemo(() => {
    return latestClientNotifications
      .filter(isClientRevisionNotification)
      .some((n) => n.appRevisionId === event.metadata.app_revision_id);
  }, [JSON.stringify(latestClientNotifications)]);

  const onRevert = useCallback(async (id: string) => {
    try {
      setIsReverting(true);

      await api.revertApp(
        "<token>",
        {
          deployment_target_id: deploymentTargetId,
          app_revision_id: id,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
          porter_app_name: porterApp.name,
        }
      );
    } catch {
    } finally {
      setRevertData(null);
      setIsReverting(false);
    }
  }, []);

  const renderStatusText = (): React.ReactNode => {
    const versionNumber = revisionIdToNumber[event.metadata.app_revision_id];
    const serviceMetadata = event.metadata.service_deployment_metadata;

    const getStatusText = (
      status: string,
      text: string,
      numServices: number,
      addEllipsis?: boolean
    ): React.ReactNode => {
      if (versionNumber) {
        text += ` version ${versionNumber}`;
      }

      return serviceMetadata != null ? (
        <StatusTextContainer>
          <Text color={getStatusColor(status)}>{text} to</Text>
          <Spacer inline x={0.25} />
          {renderServiceDropdownCta(numServices, getStatusColor(status))}
        </StatusTextContainer>
      ) : (
        <Text color={getStatusColor(status)}>
          {text} {addEllipsis && "..."}
        </Text>
      );
    };

    let failedServices = 0;
    let canceledServices = 0;
    let successfulServices = 0;
    let progressingServices = 0;

    if (serviceMetadata != null) {
      for (const key in serviceMetadata) {
        if (serviceMetadata[key].status === "FAILED") {
          failedServices++;
        }
        if (serviceMetadata[key].status === "CANCELED") {
          canceledServices++;
        }
        if (serviceMetadata[key].status === "SUCCESS") {
          successfulServices++;
        }
        if (serviceMetadata[key].status === "PROGRESSING") {
          progressingServices++;
        }
      }
    }

    return match(event.status)
      .with("SUCCESS", () =>
        getStatusText(event.status, "Deployed", successfulServices)
      )
      .with("FAILED", () =>
        getStatusText(event.status, "Failed to deploy", failedServices)
      )
      .with("CANCELED", () =>
        getStatusText(event.status, "Canceled deployment", canceledServices)
      )
      .otherwise(() =>
        getStatusText(event.status, "Deploying", progressingServices, true)
      );
  };

  const renderRevisionDiffModal = (
    event: PorterAppDeployEvent
  ): JSX.Element | null => {
    const changedRevisionId = event.metadata.app_revision_id;
    const changedRevisionNumber =
      revisionIdToNumber[event.metadata.app_revision_id];
    if (changedRevisionNumber == null || changedRevisionNumber === 1) {
      return null;
    }
    const baseRevisionNumber =
      revisionIdToNumber[event.metadata.app_revision_id] - 1;
    if (numberToRevisionId[baseRevisionNumber] == null) {
      return null;
    }
    const baseRevisionId = numberToRevisionId[baseRevisionNumber];
    return (
      <>
        <Tag>
          <Link
            onClick={() => {
              setDiffModalVisible(true);
            }}
          >
            <TagIcon src={view_changes} />
            View changes
          </Link>
        </Tag>
        {diffModalVisible && (
          <RevisionDiffModal
            base={{
              revisionId: baseRevisionId,
              revisionNumber: baseRevisionNumber,
            }}
            changed={{
              revisionId: changedRevisionId,
              revisionNumber: changedRevisionNumber,
            }}
            close={() => {
              setDiffModalVisible(false);
            }}
            projectId={projectId}
            clusterId={clusterId}
            appName={appName}
          />
        )}
      </>
    );
  };

  const renderServiceDropdownCta = (
    numServices: number,
    color?: string
  ): React.ReactNode => {
    return (
      <ServiceStatusDropdownCtaContainer>
        <Link
          color={color}
          onClick={() => {
            setServiceStatusVisible(!serviceStatusVisible);
          }}
        >
          <ServiceStatusDropdownIcon
            className="material-icons"
            serviceStatusVisible={serviceStatusVisible}
          >
            arrow_drop_down
          </ServiceStatusDropdownIcon>
          {numServices} service{numServices === 1 ? "" : "s"}
        </Link>
      </ServiceStatusDropdownCtaContainer>
    );
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={deploy} />
          <Spacer inline width="10px" />
          <Text>Application deploy</Text>
          {gitCommitUrl && displayCommitSha ? (
            <>
              <Spacer inline x={0.5} />
              <ImageTagContainer>
                <Link
                  to={gitCommitUrl}
                  target="_blank"
                  showTargetBlankIcon={false}
                >
                  <CommitIcon src={pull_request_icon} />
                  <Code>{displayCommitSha}</Code>
                </Link>
              </ImageTagContainer>
            </>
          ) : event.metadata.image_tag ? (
            <>
              <Spacer inline x={0.5} />
              <ImageTagContainer hoverable={false}>
                <TagContainer>
                  <CommitIcon src={tag_icon} />
                  <Code>{event.metadata.image_tag}</Code>
                </TagContainer>
              </ImageTagContainer>
            </>
          ) : null}
          {revisionNotificationsExist && (
            <>
              <Spacer inline x={0.5} />
              <Tag borderColor="#FFBF00">
                <Link to={`/apps/${appName}/notifications`} color={"#FFBF00"}>
                  <TagIcon src={alert} />
                  Notifications
                </Link>
              </Tag>
            </>
          )}
        </Container>
        <Container row>
          <Icon height="14px" src={run_for} />
          <Spacer inline width="6px" />
          <Text color="helper">{getDuration(event)}</Text>
        </Container>
      </Container>
      <Spacer y={0.5} />
      <Container row spaced>
        <Container row>
          <Icon height="12px" src={getStatusIcon(event.status)} />
          <Spacer inline width="10px" />
          {renderStatusText()}
          {isRevertable && (
            <>
              <Spacer inline x={1} />
              <Tag>
                <Link
                  onClick={() => {
                    setRevertData({
                      revisionNumber:
                        revisionIdToNumber[event.metadata.app_revision_id],
                      id: event.metadata.app_revision_id,
                    });
                  }}
                >
                  <TagIcon src={revert} />
                  Revert to version{" "}
                  {revisionIdToNumber[event.metadata.app_revision_id]}{" "}
                </Link>
              </Tag>
            </>
          )}
          <Spacer inline x={0.5} />
          {renderRevisionDiffModal(event)}
        </Container>
      </Container>
      {event.metadata.service_deployment_metadata != null && (
        <AnimateHeight height={serviceStatusVisible ? "auto" : 0}>
          <Spacer y={0.5} />
          <ServiceStatusDetail
            serviceDeploymentMetadata={
              event.metadata.service_deployment_metadata
            }
            appName={appName}
            revisionNumber={revisionIdToNumber[event.metadata.app_revision_id]}
            revisionId={event.metadata.app_revision_id}
          />
        </AnimateHeight>
      )}
      {revertData && (
        <RevertModal
          closeModal={() => {
            setRevertData(null);
          }}
          revision={revertData}
          revert={onRevert}
          loading={isReverting}
        />
      )}
    </StyledEventCard>
  );
};

export default DeployEventCard;

const Code = styled.span`
  font-family: monospace;
`;

const ServiceStatusDropdownCtaContainer = styled.div`
  display: flex;
  justify-content: center;
  cursor: pointer;
  padding: 3px 5px;
  border-radius: 5px;
  :hover {
    background: #ffffff11;
  }
`;

const ServiceStatusDropdownIcon = styled.i`
  margin-left: -5px;
  font-size: 20px;
  border-radius: 20px;
  transform: ${(props: { serviceStatusVisible: boolean }) =>
    props.serviceStatusVisible ? "" : "rotate(-90deg)"};
  transition: transform 0.1s ease;
`;

const StatusTextContainer = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
`;

const TagIcon = styled.img`
  height: 12px;
  margin-right: 3px;
`;

const TagContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 1px;
  padding: 0px 2px;
`;
