import React from "react";
import styled from "styled-components";
import NotificationTile from "./NotificationTile";
import { ClientNotification } from "lib/porter-apps/notification";

type Props = {
    onTileClick: (event: ClientNotification) => void;
    notifications: ClientNotification[];
    selectedNotification: ClientNotification;
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
    width: 200px;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: auto;
    border-right: 1px solid #ffffff44;
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