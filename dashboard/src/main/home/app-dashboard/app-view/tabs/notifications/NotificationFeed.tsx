import React, { useState } from "react";
import styled from "styled-components";
import NotificationList from "./NotificationList";
import NotificationExpandedView from "./NotificationExpandedView";
import { PorterAppNotification } from "../activity-feed/events/types";

type Props = {
    notifications: PorterAppNotification[];
};

const NotificationFeed: React.FC<Props> = ({
    notifications,
}) => {
    const [selectedNotification, setSelectedNotification] = useState<PorterAppNotification | undefined>(notifications.length ? notifications[0] : undefined);

    const handleTileClick = (notification: PorterAppNotification) => {
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
                    />
                </>
            )}
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