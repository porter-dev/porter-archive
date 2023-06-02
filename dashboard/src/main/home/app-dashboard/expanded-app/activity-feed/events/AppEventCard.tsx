import React, { useEffect, useState } from "react";

import app_event from "assets/app_event.png";
import info from "assets/info-outlined.svg";


import run_for from "assets/run_for.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Icon from "components/porter/Icon";
import Modal from "components/porter/Modal";

import { PorterAppEvent } from "shared/types";
import { getDuration } from './utils';
import { StyledEventCard } from "./EventCard";
import styled from "styled-components";
import AppEventModal from "../../status/AppEventModal";
import { readableDate } from "shared/string_utils";
import dayjs from "dayjs";
import Anser from "anser";
import api from "shared/api";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const AppEventCard: React.FC<Props> = ({ event, appData }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [logs, setLogs] = useState([]);

  const getAppLogs = async () => {
    setShowModal(true);
    try {
      const logResp = await api.getLogsWithinTimeRange(
        "<token>",
        {
          namespace: appData.chart.namespace,
          start_range: dayjs(event.created_at).toISOString(),
          end_range: dayjs(event.updated_at).toISOString(),
          pod_selector: event.metadata.pod_name,
          limit: 1000,
        },
        {
          project_id: appData.app.project_id,
          cluster_id: appData.app.cluster_id,
        }
      )
      // console.log(logResp)
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
    <StyledEventCard row>
      <Container row spaced>
        <Container row spaced>
          <Icon height="18px" src={app_event} />
          <Spacer inline width="10px" />
          <Text size={14}>{event.metadata.detail}</Text>
        </Container>
      </Container>
      <Container row spaced>
        <ViewDetailsButton onClick={getAppLogs}>
          <Icon src={info} />
          <Spacer inline width="6px" />
          <Text>Details</Text>
        </ViewDetailsButton>
      </Container>
      {showModal && (
        <AppEventModal
          setModalVisible={setShowModal}
          logs={logs}
          porterAppName={appData.app.name}
          timestamp={readableDate(event.updated_at)}
          expandedAppEventMessage={event.metadata.summary}
        />
      )}
    </StyledEventCard>
  );
};

export default AppEventCard;

const ViewDetailsButton = styled.div<{ width?: string }>`
  border-radius: 5px;
  height: 30px;
  font-size: 13px;
  color: white;
  display: flex;
  align-items: center;
  padding: 0px 10px;
  background: #ffffff11;
  border: 1px solid #aaaabb33;
  cursor: pointer;
  :hover {
    border: 1px solid #7a7b80;
  }
`;
