import React, { useEffect, useState } from "react";

import pre_deploy from "assets/pre_deploy.png";

import run_for from "assets/run_for.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";

import { PorterAppEvent } from "shared/types";
import { getDuration, getStatusIcon } from './utils';
import { StyledEventCard } from "./EventCard";
import Link from "components/porter/Link";
import GHALogsModal from "../../status/GHALogsModal";
import { Log } from "main/home/cluster-dashboard/expanded-chart/logs-section/useAgentLogs";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const PreDeployEventCard: React.FC<Props> = ({ event, appData }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);

  const renderStatusText = (event: PorterAppEvent) => {
    switch (event.status) {
      case "SUCCESS":
        return <Text color="#68BF8B">Pre-deploy succeeded.</Text>;
      case "FAILED":
        return <Text color="#FF6060">Pre-deploy failed.</Text>;
      default:
        return <Text color="#aaaabb66">Pre-deploy in progress...</Text>;
    }
  };

  const getPredeployLogs = async () => {
    try {
      setLogs([]);
      setLogModalVisible(true);


    } catch (error) {
      console.log(appData);
      console.log(error);
    }
  };

  const renderInfoCta = (event: any) => {
    switch (event.status) {
      case "SUCCESS":
        return (
          <>
            <Link hasunderline onClick={() => getPredeployLogs()}>
              View logs
            </Link>

            {logModalVisible && (
              <GHALogsModal
                appData={appData}
                logs={logs}
                modalVisible={logModalVisible}
                setModalVisible={setLogModalVisible}
                actionRunId={event.metadata?.action_run_id}
              />
            )}
            <Spacer inline x={1} />
          </>
        );
      case "FAILED":
        return (
          <>
            {/* <Link hasunderline onClick={() => getBuildLogs()}>
              View logs
            </Link>

            {logModalVisible && (
              <GHALogsModal
                appData={appData}
                logs={logs}
                modalVisible={logModalVisible}
                setModalVisible={setLogModalVisible}
                actionRunId={event.metadata?.action_run_id}
              />
            )}
            <Spacer inline x={1} /> */}
          </>
        );
      default:
        return (
          <>
            {/* <Link
              hasunderline
              target="_blank"
              to={`https://github.com/${appData.app.repo_name}/actions/runs/${event.metadata?.action_run_id}`}
            >
              View live logs
            </Link>
            <Spacer inline x={1} /> */}
          </>
        );
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="18px" src={pre_deploy} />
          <Spacer inline width="10px" />
          <Text size={14}>Application pre-deploy</Text>
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
          <Spacer inline x={1} />
          {renderInfoCta(event)}
          {/* {event.status === "FAILED" && (
            <>
              <Link hasunderline onClick={() => triggerWorkflow()}>
                <Container row>
                  <Icon height="10px" src={refresh} />
                  <Spacer inline width="5px" />
                  Retry
                </Container>
              </Link>
            </>
          )} */}
        </Container>
      </Container>
      {showModal && (
        <Modal closeModal={() => setShowModal(false)}>{modalContent}</Modal>
      )}
    </StyledEventCard>
  );
};

export default PreDeployEventCard;
