import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import NotificationList from "./NotificationList";
import NotificationExpandedView from "./NotificationExpandedView";
import { useQuery } from "@tanstack/react-query";
import { PorterAppEvent, PorterAppEventType } from "../activity-feed/events/types";
import api from "shared/api";
import { Context } from "shared/Context";
import Loading from "components/Loading";

type Props = {
    appName: string
};

const NotificationFeed: React.FC<Props> = ({
    appName,
}) => {
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const { currentCluster, currentProject } = useContext(Context);

    const handleTileClick = (tileId: string) => {
        setSelectedEventId(tileId);
    };

    const { data: events = [], isLoading } = useQuery<PorterAppEvent[]>(
        [
            "getFeedEvents",
            currentCluster?.id,
            currentProject?.id,
            appName,
        ],
        async () => {
            if (!currentProject?.id || !currentCluster?.id) {
                return [];
            }

            const res = await api.getFeedEvents(
                "<token>",
                {},
                {
                    cluster_id: currentCluster.id,
                    project_id: currentProject.id,
                    stack_name: appName,
                }
            );
            return res.data.events?.map((event: any) => PorterAppEvent.toPorterAppEvent(event)).filter((evt: PorterAppEvent) => evt.type === PorterAppEventType.APP_EVENT) ?? []
        },
        {
            refetchOnWindowFocus: false,
            enabled: !!currentCluster?.id && !!currentProject?.id
        }
    );

    useEffect(() => {
        if (events.length > 0) {
            setSelectedEventId(events[0].id);
        }
    }, [events])

    if (isLoading) {
        return <Loading />;
    }

    return (
        <StyledNotificationFeed>
            <NotificationList onTileClick={handleTileClick} events={events} selectedEventId={selectedEventId} appName={appName} />
            {selectedEventId !== "" && <NotificationExpandedView eventId={selectedEventId} />}
        </StyledNotificationFeed>
    );
};

export default NotificationFeed;

const StyledNotificationFeed = styled.div`
    display: flex;
    height: 600px;
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