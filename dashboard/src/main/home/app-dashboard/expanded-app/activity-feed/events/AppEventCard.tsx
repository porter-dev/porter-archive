import React, { useEffect, useState } from "react";

import app_event from "assets/app_event.png";


import run_for from "assets/run_for.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";
import { Log } from "main/home/cluster-dashboard/expanded-chart/logs-section/useAgentLogs";

import { PorterAppEvent } from "shared/types";
import { getDuration } from './utils';
import { StyledEventCard } from "./EventCard";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const AppEventCard: React.FC<Props> = ({ event, appData }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const renderStatusText = (event: PorterAppEvent) => {
    switch (event.status) {
      case "SUCCESS":
        return <Text color="#68BF8B">Deployed v100</Text>;
      case "FAILED":
        return <Text color="#FF6060">Deploying v100 failed</Text>;
      default:
        return <Text color="#aaaabb66">Deploying v100...</Text>;
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="18px" src={app_event} />
          <Spacer inline width="10px" />
          <Text size={14}>Application build</Text>
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
          {renderStatusText(event)}
          <Link
            hasunderline
            onClick={() => {
              setModalContent(
                <>
                  <Container row>
                    <Icon height="20px" src={app_event} />
                    <Spacer inline width="10px" />
                    <Text size={16}>Event details</Text>
                  </Container>
                  <Spacer y={1} />
                  <Text>TODO: display event logs</Text>
                </>
              );
              setShowModal(true);
            }}
          >
            View details
          </Link>
          <Spacer inline x={1} />
        </Container>
      </Container>
      {showModal && (
        <Modal closeModal={() => setShowModal(false)}>{modalContent}</Modal>
      )}
    </StyledEventCard>
  );
};

export default AppEventCard;
