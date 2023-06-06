import React, { useEffect, useState } from "react";


import deploy from "assets/deploy.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";
import { PorterAppEvent } from "shared/types";
import { getDuration, getStatusIcon } from './utils';
import { StyledEventCard } from "./EventCard";
import styled from "styled-components";
import Button from "components/porter/Button";
import api from "shared/api";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const DeployEventCard: React.FC<Props> = ({ event, appData }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const renderStatusText = (event: PorterAppEvent) => {
    switch (event.status) {
      case "SUCCESS":
        return event.metadata.image_tag ? <Text color="#68BF8B">Deployed <Code>{event.metadata.image_tag}</Code></Text> : <Text color="#68BF8B">Deployment successful</Text>;
      case "FAILED":
        return <Text color="#FF6060">Deployment failed</Text>;
      default:
        return <Text color="#aaaabb66">Deployment in progress...</Text>;
    }
  };

  const revertToRevision = async (revision: number) => {
    try {
      await api
        .rollbackPorterApp(
          "<token>",
          {
            revision,
          },
          {
            project_id: appData.app.project_id,
            stack_name: appData.app.name,
            cluster_id: appData.app.cluster_id,
          }
        )
      window.location.reload();
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <StyledEventCard row>
      <Container column alignItems="flex-start">
        <Container row spaced>
          <Container row>
            <Icon height="18px" src={deploy} />
            <Spacer inline width="10px" />
            <Text size={14}>Application version no. {event.metadata?.revision}</Text>
          </Container>
        </Container>
        <Spacer y={0.5} />
        <Container row spaced>
          <Container row>
            <Icon height="18px" src={getStatusIcon(event.status)} />
            <Spacer inline width="10px" />
            {renderStatusText(event)}
          </Container>
        </Container>
      </Container>
      <Container row spaced>
        <RevertButton onClick={() => revertToRevision(event.metadata.revision)}>
          <Icon src={refresh} height={"13px"} />
          <Spacer inline width="6px" />
          <Text>Revert</Text>
        </RevertButton>
      </Container>
    </StyledEventCard>
  );
};

export default DeployEventCard;

const Code = styled.span`
  font-family: monospace;
`;

const RevertButton = styled.div<{ width?: string }>`
  border-radius: 5px;
  height: 30px;
  font-size: 13px;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0px 10px;
  background: #ffffff11;
  border: 1px solid #aaaabb33;
  cursor: pointer;
  :hover {
    border: 1px solid #7a7b80;
  }
  width: 92px;
`;
