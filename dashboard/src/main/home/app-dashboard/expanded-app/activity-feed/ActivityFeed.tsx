import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import refresh from "assets/refresh.png";

import Text from "components/porter/Text";

import EventCard from "./events/cards/EventCard";
import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";
import Fieldset from "components/porter/Fieldset";

import { feedDate } from "shared/string_utils";
import Pagination from "components/porter/Pagination";
import _ from "lodash";
import Button from "components/porter/Button";
import Icon from "components/porter/Icon";
import Container from "components/porter/Container";
import EventFocusView from "./events/focus-views/EventFocusView";

type Props = {
  chart: any;
  stackName: string;
  appData: any;
  eventId?: string;
};

const ActivityFeed: React.FC<Props> = ({ chart, stackName, appData, eventId }) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [hasPorterAgent, setHasPorterAgent] = useState(false);
  const [isPorterAgentInstalling, setIsPorterAgentInstalling] = useState(false);

  const getEvents = async () => {
    setLoading(true)
    if (!currentProject || !currentCluster) {
      setError(true);
      setLoading(false);
      return;
    }
    try {
      const res = await api.getFeedEvents(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          stack_name: stackName,
          page,
        }
      );

      setNumPages(res.data.num_pages);
      setEvents(res.data.events);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkForAgent = async () => {
      const project_id = currentProject?.id;
      const cluster_id = currentCluster?.id;
      if (project_id == null || cluster_id == null) {
        setError(true);
        return;
      }
      try {
        const res = await api.detectPorterAgent("<token>", {}, { project_id, cluster_id });
        const hasAgent = res.data?.version === "v3";
        setHasPorterAgent(hasAgent);
      } catch (err) {
        if (err.response?.status === 404) {
          setHasPorterAgent(false);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!hasPorterAgent) {
      checkForAgent();
    } else {
      getEvents();
    }

  }, [currentProject, currentCluster, hasPorterAgent, page]);


  const installAgent = async () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    setIsPorterAgentInstalling(true);
    try {
      await api.installPorterAgent("<token>", {}, { project_id, cluster_id });
      window.location.reload();
    } catch (err) {
      setIsPorterAgentInstalling(false);
      console.log(err);
    }
  };

  if (isPorterAgentInstalling) {
    return (
      <Fieldset>
        <Text size={16}>Installing agent...</Text>
        <Spacer y={0.5} />
        <Text color="helper">If you are not redirected automatically after a minute, you may need to refresh this page.</Text>
      </Fieldset>
    );
  }

  if (error) {
    return (
      <Fieldset>
        <Text size={16}>Error retrieving events</Text>
        <Spacer height="15px" />
        <Text color="helper">An unexpected error occurred.</Text>
      </Fieldset>
    );
  }

  if (loading) {
    return (
      <div>
        <Spacer y={2} />
        <Loading />
      </div>
    );
  }

  if (eventId != null) {
    return <EventFocusView
      eventId={eventId}
      appData={appData}
    />;
  }

  if (!hasPorterAgent) {
    return (
      <Fieldset>
        <Text size={16}>
          We couldn't detect the Porter agent on your cluster
        </Text>
        <Spacer y={0.5} />
        <Text color="helper">
          In order to use the Activity tab, you need to install the Porter agent.
        </Text>
        <Spacer y={1} />
        <Button onClick={() => installAgent()}>
          <I className="material-icons">add</I> Install Porter agent
        </Button>
      </Fieldset>
    );
  }

  if (!loading && events?.length === 0) {
    return (
      <Fieldset>
        <Text size={16}>No events found for "{stackName}"</Text>
        <Spacer height="15px" />
        <Text color="helper">
          This application currently has no associated events.
        </Text>
      </Fieldset>
    );
  }

  return (
    <StyledActivityFeed>
      {events.map((event, i) => {
        return (
          <EventWrapper isLast={i === events.length - 1} key={i}>
            {i !== events.length - 1 && events.length > 1 && <Line />}
            <Dot />
            <Time>
              <Text>{feedDate(event.created_at).split(", ")[0]}</Text>
              <Spacer x={0.5} />
              <Text>{feedDate(event.created_at).split(", ")[1]}</Text>
            </Time>
            <EventCard appData={appData} event={event} key={i} />
          </EventWrapper>
        );
      })}
      {numPages > 1 && (
        <>
          <Spacer y={1} />
          <Pagination page={page} setPage={setPage} totalPages={numPages} />
        </>
      )}
      <Spacer y={1} />
      <Container row spaced>
        <Spacer inline x={1} />
        <Button
          onClick={getEvents}
          height="20px"
          color="fg"
          withBorder
        >
          <Icon src={refresh} height="10px"></Icon>
          <Spacer inline x={0.5} />
          Refresh feed
        </Button>
      </Container>
    </StyledActivityFeed>
  );
};

export default ActivityFeed;

const I = styled.i`
  font-size: 14px;
  margin-right: 5px;
`;

const Time = styled.div`
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
  width: 90px;
`;

const Line = styled.div`
  width: 1px;
  height: calc(100% + 30px);
  background: #414141;
  position: absolute;
  left: 3px;
  top: 36px;
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
`;

const Dot = styled.div`
  width: 7px;
  height: 7px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  left: 0;
  top: 36px;
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
`;

const EventWrapper = styled.div<{
  isLast: boolean;
}>`
  padding-left: 30px;
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: ${(props) => (props.isLast ? "" : "25px")};
`;

const StyledActivityFeed = styled.div`
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
