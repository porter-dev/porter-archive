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

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const PreDeployEventCard: React.FC<Props> = ({ event, appData }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [pods, setPods] = useState([]);

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

  const getPodWithCorrectTimestamp = (
    getJobPodsResponses: any[],
    start_range: dayjs.Dayjs,
    end_range: dayjs.Dayjs,
  ) => {
    let filteredObjects = getJobPodsResponses.filter(obj =>
      obj.data &&
      obj.data.some((d: any) => {
        return (
          d?.metadata?.creationTimestamp &&
          dayjs(d.metadata.creationTimestamp) >= start_range &&
          dayjs(d.metadata.creationTimestamp) <= end_range
        );
      })
    );

    if (filteredObjects.length === 0) {
      return undefined;
    }

    return filteredObjects[filteredObjects.length - 1]
  }

  const getPredeployLogs = async () => {
    setLogModalVisible(true);
    try {
      // get the pod name
      const filters = {
        namespace: appData.releaseChart.namespace,
        match_prefix: appData.releaseChart.name,
        start_range: dayjs(event.metadata.start_time).toISOString(),
        end_range: dayjs(event.metadata.end_time).toISOString(),
      };
      const logPodValuesResp = await api.getLogPodValues("<TOKEN>", filters, {
        project_id: appData.app.project_id,
        cluster_id: appData.app.cluster_id,
      });
      const logPodValues = logPodValuesResp.data;

      if (logPodValues != null && logPodValues.length > 0) {
        // wheeeee
        const podNames = logPodValues.map((v: string) => v.split('-hook')[0] + '-hook');
        const getJobPodsResponses = await Promise.all(podNames.map((podName: string) => api.getJobPods(
          "<token>",
          {},
          {
            id: appData.app.project_id,
            name: podName,
            cluster_id: appData.app.cluster_id,
            namespace: appData.releaseChart.namespace,
          },
        )));
        const latestPod = getPodWithCorrectTimestamp(getJobPodsResponses, dayjs(event.metadata.start_time), dayjs(event.metadata.end_time));
        if (latestPod != null) {
          setPods(latestPod.data);
        }
      }

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
              selectedPod={pods[0]}
              podError={!pods[0] ? "Pod no longer exists." : ""}
              setModalVisible={setLogModalVisible}
              logsName={"pre-deploy"}
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
