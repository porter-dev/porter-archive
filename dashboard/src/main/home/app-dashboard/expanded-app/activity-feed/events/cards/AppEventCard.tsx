import React, { useState } from "react";

import app_event from "assets/app_event.png";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Icon from "components/porter/Icon";

import { PorterAppEvent } from "shared/types";
import { StyledEventCard } from "./EventCard";
import styled from "styled-components";
import AppEventModal from "../../../status/AppEventModal";
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
          start_range: dayjs(event.created_at).subtract(1, 'minute').toISOString(),
          end_range: dayjs(event.updated_at).add(1, 'minute').toISOString(),
          pod_selector: event.metadata.pod_name.endsWith(".*") ? event.metadata.pod_name : event.metadata.pod_name + ".*",
          limit: 1000,
        },
        {
          project_id: appData.app.project_id,
          cluster_id: appData.app.cluster_id,
        }
      )

      const updatedLogs = logResp.data.logs.map((l: { line: string; timestamp: string; }, index: number) => {
        try {
          return {
            line: JSON.parse(l.line)?.log ?? Anser.ansiToJson(l.line),
            lineNumber: index + 1,
            timestamp: l.timestamp,
          }
        } catch (err) {
          return {
            line: Anser.ansiToJson(l.line),
            lineNumber: index + 1,
            timestamp: l.timestamp,
          }
        }
      });

      setLogs(updatedLogs);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={app_event} />
          <Spacer inline width="10px" />
          <Text>{event.metadata.detail}</Text>
        </Container>
      </Container>
      <Spacer y={0.5} />
      <Container row spaced>
        <TempWrapper>
          <Link onClick={getAppLogs} hasunderline>
            View details
          </Link>
        </TempWrapper>
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

const TempWrapper = styled.div`
  margin-top: -3px;
`;

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
