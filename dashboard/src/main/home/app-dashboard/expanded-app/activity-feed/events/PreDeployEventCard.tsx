import React, { useState } from "react";

import pre_deploy from "assets/pre_deploy.png";

import run_for from "assets/run_for.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";

import { PorterAppEvent } from "shared/types";
import { getDuration, getStatusIcon, triggerWorkflow } from './utils';
import { StyledEventCard } from "./EventCard";
import Link from "components/porter/Link";
import LogsModal from "../../status/LogsModal";
import api from "shared/api";
import dayjs from "dayjs";
import Anser from "anser";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const PreDeployEventCard: React.FC<Props> = ({ event, appData }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logs, setLogs] = useState([]);

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
    setLogModalVisible(true);
    try {
      const logResp = await api.getChartLogsWithinTimeRange(
        "<token>",
        {
          chart_name: appData.releaseChart.name,
          namespace: appData.releaseChart.namespace,
          start_range: dayjs(event.metadata.start_time).toISOString(),
          end_range: dayjs(event.metadata.end_time).toISOString(),
          limit: 1000,
        },
        {
          project_id: appData.app.project_id,
          cluster_id: appData.app.cluster_id,
        }
      )
      const updatedLogs = logResp.data.logs.map((l: { line: string; timestamp: string; }, index: number) =>
      ({
        line: Anser.ansiToJson(l.line),
        lineNumber: index + 1,
        timestamp: l.timestamp,
      }));

      setLogs(updatedLogs);
    } catch (error) {
      console.log(error);
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
          <Link hasunderline onClick={() => getPredeployLogs()}>
            View logs
          </Link>
          {event.status === "FAILED" && (
            <>
              <Spacer inline x={1} />

              <Link hasunderline onClick={() => triggerWorkflow(appData)}>
                <Container row>
                  <Icon height="10px" src={refresh} />
                  <Spacer inline width="5px" />
                  Retry
                </Container>
              </Link>
            </>
          )}
          {logModalVisible && (
            <LogsModal
              logs={logs}
              logsName={"pre-deploy"}
              setModalVisible={setLogModalVisible}
            />
          )}
          <Spacer inline x={1} />
        </Container>
      </Container>
      {showModal && (
        <Modal closeModal={() => setShowModal(false)}>{modalContent}</Modal>
      )}
    </StyledEventCard>
  );
};

export default PreDeployEventCard;
