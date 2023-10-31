import React, { useState } from "react";
import styled from "styled-components";
import NotificationList from "./NotificationList";
import NotificationExpandedView from "./NotificationExpandedView";
import { PorterAppNotificationEvent } from "../activity-feed/events/types";

type Props = {
    notifications: PorterAppNotificationEvent[];
};

const NotificationFeed: React.FC<Props> = ({
    notifications,
}) => {
    const [selectedNotification, setSelectedNotification] = useState<PorterAppNotificationEvent | null>(null);

    const handleTileClick = (notification: PorterAppNotificationEvent) => {
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