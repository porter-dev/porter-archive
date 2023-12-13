import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import _ from "lodash";
import { useLocation } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";

import api from "shared/api";

import {
  porterAppEventValidator,
  type PorterAppBuildEvent,
  type PorterAppPreDeployEvent,
} from "../types";
import BuildEventFocusView from "./BuildEventFocusView";
import PreDeployEventFocusView from "./PredeployEventFocusView";

const EVENT_POLL_INTERVAL = 5000; // poll every 5 seconds

type SupportedEventFocusViewEvent =
  | PorterAppBuildEvent
  | PorterAppPreDeployEvent;

const EventFocusView: React.FC = () => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const eventId = queryParams.get("event_id");
  const { projectId, clusterId, internalLinkBuilder } = useLatestRevision();

  const [event, setEvent] = useState<SupportedEventFocusViewEvent | null>(null);

  const { data } = useQuery(
    ["getPorterAppEvent", projectId, clusterId, eventId, event],
    async () => {
      if (eventId == null || eventId === "") {
        return null;
      }
      const eventResp = await api.getPorterAppEvent(
        "<token>",
        {},
        {
          project_id: projectId,
          cluster_id: clusterId,
          event_id: eventId,
        }
      );
      return porterAppEventValidator.parse(eventResp.data.event);
    },
    {
      // last condition checks if the event is done running; then we stop refetching
      enabled:
        eventId != null &&
        eventId !== "" &&
        !(event?.metadata.end_time != null),
      refetchInterval: EVENT_POLL_INTERVAL,
    }
  );

  useEffect(() => {
    if (data != null && (data.type === "BUILD" || data.type === "PRE_DEPLOY")) {
      setEvent(data);
    }
  }, [data]);

  const getEventFocusView = (): JSX.Element => {
    return match(event)
      .with({ type: "BUILD" }, (ev) => <BuildEventFocusView event={ev} />)
      .with({ type: "PRE_DEPLOY" }, (ev) => (
        <PreDeployEventFocusView event={ev} />
      ))
      .with(null, () => {
        if (eventId != null && eventId !== "") {
          return <Loading />;
        } else {
          return <div>Event not found</div>;
        }
      })
      .exhaustive();
  };

  return (
    <AppearingView>
      <Link
        to={internalLinkBuilder({
          tab: "activity",
        })}
      >
        <BackButton>
          <i className="material-icons">keyboard_backspace</i>
          Activity feed
        </BackButton>
      </Link>
      <Spacer y={0.5} />
      {getEventFocusView()}
    </AppearingView>
  );
};

export default EventFocusView;

export const AppearingView = styled.div`
  width: 100%;
  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const BackButton = styled.div`
  display: flex;
  align-items: center;
  max-width: fit-content;
  cursor: pointer;
  font-size: 11px;
  max-height: fit-content;
  padding: 5px 13px;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  color: white;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
  }

  > i {
    color: white;
    font-size: 16px;
    margin-right: 6px;
  }
`;
