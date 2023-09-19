import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";
import React, { useEffect, useState } from "react";
import api from "shared/api";
import styled from "styled-components";
import Link from "components/porter/Link";
import BuildFailureEventFocusView from "./BuildFailureEventFocusView";
import PreDeployEventFocusView from "./PredeployEventFocusView";
import _ from "lodash";
import { PorterAppBuildEvent, PorterAppPreDeployEvent, porterAppEventValidator } from "../types";
import { useLocation } from "react-router";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import { useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";

const EVENT_POLL_INTERVAL = 5000; // poll every 5 seconds

type SupportedEventFocusViewEvent = PorterAppBuildEvent | PorterAppPreDeployEvent;

const EventFocusView: React.FC = ({ }) => {
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const eventId = queryParams.get("event_id");
    const { projectId, clusterId, latestProto, deploymentTargetId, latestRevision } = useLatestRevision();

    const [event, setEvent] = useState<SupportedEventFocusViewEvent | null>(null);

    const { data } = useQuery(
        [
            "getPorterAppEvent",
            projectId,
            clusterId,
            eventId,
            event,
        ],
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
            enabled: eventId != null && eventId !== "" && !(event != null && event.metadata.end_time != null),
            refetchInterval: EVENT_POLL_INTERVAL,
        }
    );

    useEffect(() => {
        if (data != null && (data.type === "BUILD" || data.type === "PRE_DEPLOY")) {
            setEvent(data);
        }
    }, [data]);

    const getEventFocusView = () => {
        return match(event)
            .with({ type: "BUILD" }, (ev) => <BuildFailureEventFocusView event={ev} />)
            .with({ type: "PRE_DEPLOY" }, (ev) => <PreDeployEventFocusView event={ev} />)
            .with(null, () => {
                if (eventId != null && eventId !== "") {
                    return <Loading />;
                } else {
                    return <div>Event not found</div>;
                }
            })
            .exhaustive();
    }

    return (
        <AppearingView>
            <Link to={`/apps/${latestProto.name}/activity`}>
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