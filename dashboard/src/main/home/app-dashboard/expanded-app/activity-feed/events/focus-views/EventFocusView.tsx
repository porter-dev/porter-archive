import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import { PorterAppEvent } from "shared/types";
import Link from "components/porter/Link";
import BuildFailureEventFocusView from "./BuildFailureEventFocusView";
import PreDeployFailureEventFocusView from "./PredeployFailureEventFocusView";

type Props = {
    eventId: string;
    appData: any;
};

const EventFocusView: React.FC<Props> = ({
    eventId,
    appData,
}) => {
    const { currentProject, currentCluster } = useContext(Context);
    const [event, setEvent] = useState<PorterAppEvent | null>(null);

    useEffect(() => {
        const getEvent = async () => {
            if (currentProject == null || currentCluster == null) {
                return;
            }
            try {
                const eventResp = await api.getPorterAppEvent(
                    "<token>",
                    {},
                    {
                        project_id: currentProject.id,
                        cluster_id: currentCluster.id,
                        event_id: eventId,
                    }
                )
                setEvent(eventResp.data.event as PorterAppEvent)
            } catch (err) {
                console.log(err);
            }
        }
        getEvent();
    }, []);

    const getEventFocusView = (event: PorterAppEvent, appData: any) => {
        switch (event.type) {
            case "BUILD":
                return <BuildFailureEventFocusView event={event} appData={appData} />
            case "PRE_DEPLOY":
                return <PreDeployFailureEventFocusView event={event} appData={appData} />
            default:
                return null
        }
    }

    return (
        <StyledEventFocusView>
            <Link to={`/apps/${appData.app.name}/activity`}>
                <BackButton>
                    <i className="material-icons">keyboard_backspace</i>
                    Activity feed
                </BackButton>
            </Link>
            <Spacer y={0.5} />
            {event == null && <Loading />}
            {event != null && getEventFocusView(event, appData)}
        </StyledEventFocusView>
    );
};

export default EventFocusView;

const StyledEventFocusView = styled.div`
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