import React from "react";
import styled from "styled-components";
import { PorterAppNotification } from "../activity-feed/events/types";
import NotificationTile from "./NotificationTile";

type Props = {
    onTileClick: (event: PorterAppNotification) => void;
    notifications: PorterAppNotification[];
    selectedNotification: PorterAppNotification;
};

const NotificationList: React.FC<Props> = ({
    onTileClick,
    notifications,
    selectedNotification,
}) => {
    return (
        <StyledNotificationList>
            {notifications.map((notif) => (
                <NotificationTile 
                    key={notif.id} 
                    notification={notif} 
                    selected={notif.id === selectedNotification.id} 
                    onClick={() => onTileClick(notif)} 
                />
            ))}
        </StyledNotificationList>
    );
};

export default NotificationList;

const StyledNotificationList = styled.div`
    width: 300px;
    display: flex;
    flex-direction: column;
    height: 600px;
    overflow: auto;
    border-bottom: 1px solid #494b4f;
    ::-webkit-scrollbar {
        width: 3px;
        :horizontal {
          height: 3px;
        }
      }
    
      ::-webkit-scrollbar-corner {
        width: 3px;
        background: #ffffff11;
        color: white;
      }
    
      ::-webkit-scrollbar-track {
        width: 3px;
        -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
        box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
      }
    
      ::-webkit-scrollbar-thumb {
        background-color: darkgrey;
        outline: 1px solid slategrey;
      }
`;