import React, { useState } from "react";

import app_event from "assets/app_event.png";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Icon from "components/porter/Icon";

import { StyledEventCard } from "./EventCard";
import { readableDate } from "shared/string_utils";
import dayjs from "dayjs";
import Anser from "anser";
import api from "shared/api";
import { PorterAppAppEvent } from "../types";
import { Direction } from "main/home/app-dashboard/expanded-app/logs/types";
import AppEventModal from "main/home/app-dashboard/expanded-app/status/AppEventModal";

type Props = {
  event: PorterAppAppEvent;
  deploymentTargetId: string;
  projectId: number;
  clusterId: number;
  appName: string;
};

const AppEventCard: React.FC<Props> = ({ event, deploymentTargetId, projectId, clusterId, appName }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [logs, setLogs] = useState([]);

  const getAppLogs = async () => {
    setShowModal(true);
    try {
      const logResp = await api.appLogs(
        "<token>",
        {
          start_range: dayjs(event.created_at).subtract(1, 'minute').toISOString(),
          end_range: dayjs(event.updated_at).add(1, 'minute').toISOString(),
          app_name: event.metadata.app_name,
          service_name: event.metadata.service_name,
          deployment_target_id: deploymentTargetId,
          limit: 1000,
          direction: Direction.forward,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
        }
      )

      if (logResp.data?.logs != null) {
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
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={app_event} />
          <Spacer inline x={1} />
          <Text>{event.metadata.summary}</Text>
        </Container>
      </Container>
      <Spacer y={0.5} />
      <Container row spaced>
        <Link onClick={getAppLogs} hasunderline>
          View details
        </Link>
      </Container>
      {showModal && (
        <AppEventModal
          setModalVisible={setShowModal}
          logs={logs}
          porterAppName={appName}
          timestamp={readableDate(event.updated_at)}
          expandedAppEventMessage={event.metadata.detail}
        />
      )}
    </StyledEventCard>
  );
};

export default AppEventCard;

