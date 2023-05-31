import React, { useEffect, useState } from "react";


import run_for from "assets/run_for.png";
import deploy from "assets/deploy.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";
import { PorterAppEvent } from "shared/types";
import { getDuration, getStatusIcon } from './utils';
import { StyledEventCard } from "./EventCard";

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
        return <Text color="#68BF8B">Deployment succeeded.</Text>;
      case "FAILED":
        return <Text color="#FF6060">Deployment failed.</Text>;
      default:
        return <Text color="#aaaabb66">Deployment in progress...</Text>;
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="18px" src={deploy} />
          <Spacer inline width="10px" />
          <Text size={14}>Application deploy</Text>
        </Container>
        <Container row>
          <Icon height="14px" src={run_for} />
          <Spacer inline width="6px" />
          <Text color="helper">{getDuration(event)}</Text>
        </Container>
      </Container>
      <Spacer y={1} />
      <Container row spaced>
        <Container row>
          <Icon height="18px" src={getStatusIcon(event.status)} />
          <Spacer inline width="10px" />
          {renderStatusText(event)}
        </Container>
      </Container>
      {showModal && (
        <Modal closeModal={() => setShowModal(false)}>{modalContent}</Modal>
      )}
    </StyledEventCard>
  );
};

export default DeployEventCard;
