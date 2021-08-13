import React from "react";
import styled from "styled-components";

import EventLogs from "components/events/EventLogs";
import EventsList from "components/events/EventsList";
import EventsContextProvider, {
  EventContext,
  EventsContextType,
} from "components/events/EventsContext";
import loadingSrc from "assets/loading.gif";

type EventsTabProps = {
  controllers: { type: string; name: string }[];
};

const EventsTab: React.FunctionComponent<EventsTabProps> = ({
  controllers,
}) => {
  const renderContent = ({
    isLoading,
    isPorterAgentInstalled,
    isPorterAgentInstalling,
    selectedEvent,
    installPorterAgent,
  }: EventsContextType) => {
    if (isPorterAgentInstalling) {
      return (
        <Placeholder>
          <div>
            <Header>
              <Spinner src={loadingSrc} /> Installing porter agent
            </Header>
            This should be quick, if it takes too long please contact the porter
            team.
          </div>
        </Placeholder>
      );
    }

    if (isLoading) {
      return (
        <Placeholder>
          <div>
            <Header>
              <Spinner src={loadingSrc} />
            </Header>
          </div>
        </Placeholder>
      );
    }

    if (!isPorterAgentInstalled) {
      return (
        <Placeholder>
          <div>
            <Header>We coulnd't detect porter agent :(</Header>
            In order to use the events tab you should install the porter agent!
            <InstallPorterAgentButton onClick={() => installPorterAgent()}>
              <i className="material-icons">add</i> Install porter agent
            </InstallPorterAgentButton>
          </div>
        </Placeholder>
      );
    }

    if (!selectedEvent) {
      return <EventsList />;
    }

    return <EventLogs />;
  };

  return (
    <EventsPageWrapper>
      <EventsContextProvider controllers={controllers} enableNodeEvents={false}>
        <EventContext.Consumer>
          {(context) => renderContent(context)}
        </EventContext.Consumer>
      </EventsContextProvider>
    </EventsPageWrapper>
  );
};

export default EventsTab;

const EventsPageWrapper = styled.div`
  margin-top: 35px;
  padding-bottom: 80px;
`;

const InstallPorterAgentButton = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
  font-family: "Work Sans", sans-serif;
  border: none;
  border-radius: 20px;
  color: white;
  height: 35px;
  padding: 0px 8px;
  padding-bottom: 1px;
  margin-top: 10px;
  font-weight: 500;
  padding-right: 15px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 0 5px 8px 0px #00000010;
  cursor: ${(props: { disabled?: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};

  background: ${(props: { disabled?: boolean }) =>
    props.disabled ? "#aaaabbee" : "#616FEEcc"};
  :hover {
    background: ${(props: { disabled?: boolean }) =>
      props.disabled ? "" : "#505edddd"};
  }

  > i {
    color: white;
    width: 18px;
    height: 18px;
    font-weight: 600;
    font-size: 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;

const Placeholder = styled.div`
  min-height: 400px;
  height: 50vh;
  padding: 30px;
  padding-bottom: 90px;
  font-size: 13px;
  color: #ffffff44;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Header = styled.div`
  font-weight: 500;
  color: #aaaabb;
  font-size: 16px;
  margin-bottom: 15px;
`;

const Spinner = styled.img`
  width: 15px;
  height: 15px;
  margin-right: 12px;
  margin-bottom: -2px;
`;
