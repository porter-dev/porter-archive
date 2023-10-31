import React, { useState } from "react";
import deploy from "assets/deploy.png";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Icon from "components/porter/Icon";
import { getDuration, getStatusColor, getStatusIcon } from '../utils';
import { ImageTagContainer, CommitIcon, StyledEventCard } from "./EventCard";
import styled from "styled-components";
import Link from "components/porter/Link";
import { PorterAppDeployEvent } from "../types";
import AnimateHeight from "react-animate-height";
import ServiceStatusDetail from "./ServiceStatusDetail";
import { useRevisionList } from "lib/hooks/useRevisionList";
import RevisionDiffModal from "../modals/RevisionDiffModal";
import pull_request_icon from "assets/pull_request_icon.svg";
import run_for from "assets/run_for.png";
import { match } from "ts-pattern";

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
  const [revertModalVisible, setRevertModalVisible] = useState(false);
  const [serviceStatusVisible, setServiceStatusVisible] = useState(showServiceStatusDetail);

  const { revisionIdToNumber, numberToRevisionId } = useRevisionList({ appName, deploymentTargetId, projectId, clusterId });

  const renderStatusText = () => {
    const versionNumber = revisionIdToNumber[event.metadata.app_revision_id];
    const serviceMetadata = event.metadata.service_deployment_metadata;
  
    const getStatusText = (status: string, text: string, numServices: number, addEllipsis?: boolean) => {
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
        <Text color={getStatusColor(status)}>{text} {addEllipsis && "..."}</Text>
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
      .with("SUCCESS", () => getStatusText(event.status, "Deployed", successfulServices))
      .with("FAILED", () => getStatusText(event.status, "Failed to deploy", failedServices))
      .with("CANCELED", () => getStatusText(event.status, "Canceled deployment", canceledServices))
      .otherwise(() => getStatusText(event.status, "Deploying", progressingServices, true));
  };
  
  const renderRevisionDiffModal = (event: PorterAppDeployEvent) => {
    const changedRevisionId = event.metadata.app_revision_id;
    const changedRevisionNumber = revisionIdToNumber[event.metadata.app_revision_id];
    if (changedRevisionNumber == null || changedRevisionNumber == 1) {
      return null;
    }
    const baseRevisionNumber = revisionIdToNumber[event.metadata.app_revision_id] - 1;
    if (numberToRevisionId[baseRevisionNumber] == null) {
      return null;
    }
    const baseRevisionId = numberToRevisionId[baseRevisionNumber];
    return (
      <>
        <Link hasunderline onClick={() => setDiffModalVisible(true)}>
          View changes
        </Link>
        {diffModalVisible && (
          <RevisionDiffModal
            base={{ revisionId: baseRevisionId, revisionNumber: baseRevisionNumber }}
            changed={{ revisionId: changedRevisionId, revisionNumber: changedRevisionNumber }}
            close={() => setDiffModalVisible(false)}
            projectId={projectId}
            clusterId={clusterId}
            appName={appName}
          />
        )}
      </>
    )
  }

  const renderServiceDropdownCta = (numServices: number, color?: string) => {
    return (
      <ServiceStatusDropdownCtaContainer >
        <Link color={color} onClick={() => setServiceStatusVisible(!serviceStatusVisible)}>
          <ServiceStatusDropdownIcon className="material-icons" serviceStatusVisible={serviceStatusVisible}>arrow_drop_down</ServiceStatusDropdownIcon>
          {numServices} service{numServices === 1 ? "" : "s"}
        </Link>
      </ServiceStatusDropdownCtaContainer>
    )
  }

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={deploy} />
          <Spacer inline width="10px" />
          <Text>Application deploy</Text>
          {gitCommitUrl && displayCommitSha ?
            <>
              <Spacer inline x={0.5} />
              <ImageTagContainer>
                <Link to={gitCommitUrl} target="_blank" showTargetBlankIcon={false}>
                  <CommitIcon src={pull_request_icon} />
                  <Code>{displayCommitSha}</Code>
                </Link>
              </ImageTagContainer> 
            </>
            :
            <>
              <Spacer inline x={0.5} />
              <ImageTagContainer hoverable={false}>
                <Code>{event.metadata.image_tag}</Code>
              </ImageTagContainer> 
            </>
          }
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
          {/** uncomment the below once we've implemented revert from here */}
          {/* {revisionIdToNumber[event.metadata.app_revision_id] != null && latestRevision.revision_number !== revisionIdToNumber[event.metadata.app_revision_id] && (
            <>
              <Spacer inline x={1} />
              <TempWrapper>
                <Link hasunderline onClick={() => setRevertModalVisible(true)}>
                  Revert to version {revisionIdToNumber[event.metadata.app_revision_id]}
                </Link>

              </TempWrapper>
            </>
          )} */}
          <Spacer inline x={0.5} />
          {renderRevisionDiffModal(event)}
        </Container>
      </Container>
      {event.metadata.service_deployment_metadata != null &&
        <AnimateHeight height={serviceStatusVisible ? "auto" : 0}>
          <Spacer y={0.5} />
          <ServiceStatusDetail
            serviceDeploymentMetadata={event.metadata.service_deployment_metadata}
            appName={appName}
            revision={revisionIdToNumber[event.metadata.app_revision_id]}
          />
        </AnimateHeight>
      }
    </StyledEventCard>
  );
};

export default DeployEventCard;

// TODO: remove after fixing v-align
const TempWrapper = styled.div`
  margin-top: -3px;
`;

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
`

const StatusTextContainer = styled.div`
  display: flex;
  align-items: center;
  flex-direction: row;
`;
