import React, { useState } from "react";
import styled from "styled-components";
import NotificationList from "./NotificationList";
import NotificationExpandedView from "./NotificationExpandedView";
import { ClientNotification } from "lib/porter-apps/notification";

type Props = {
    notifications: ClientNotification[];
    projectId: number;
    clusterId: number;
    appName: string;
    deploymentTargetId: string;
    appId: number;
};

const NotificationFeed: React.FC<Props> = ({
    notifications,
    projectId,
    clusterId,
    appName,
    deploymentTargetId,
    appId,
}) => {
    const [selectedNotification, setSelectedNotification] = useState<ClientNotification | undefined>(notifications.length ? notifications[0] : undefined);

    const handleTileClick = (notification: ClientNotification) => {
        setSelectedNotification(notification);
    };

    return (
        <StyledNotificationFeed>
            {selectedNotification && (
                <>
                    <NotificationList 
                        onTileClick={handleTileClick} 
                        notifications={notifications} 
                        selectedNotification={selectedNotification} 
                    />
                    <NotificationExpandedView 
                        notification={selectedNotification} 
                        projectId={projectId}
                        clusterId={clusterId}
                        appName={appName}
                        deploymentTargetId={deploymentTargetId}
                        appId={appId}
                    />
                </>
            )}
        </StyledNotificationFeed>
    );
};

export default NotificationFeed;

const StyledNotificationFeed = styled.div`
    display: flex;
    margin-bottom: -50px;
    height: 800px;
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