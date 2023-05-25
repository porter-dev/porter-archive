import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import Text from "components/porter/Text";
import Container from "components/porter/Container";

import EventCard from "./EventCard";
import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";
import Fieldset from "components/porter/Fieldset";

import { feedDate } from "shared/string_utils";

type Props = {
  chart: any;
  stackName: string;
};

const ActivityFeed: React.FC<Props> = ({
  chart,
  stackName,
}) => {
  const { currentProject, currentCluster } = useContext(Context);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const getEvents = async () => {
    setLoading(true);
    try {
      const res = await api.getFeedEvents(
        "<token>",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          stack_name: stackName,
        }
      );
      setEvents(res.data.events);
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }
  
  useEffect(() => {
    getEvents();
  }, []);

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
  };

  return (
    <StyledActivityFeed>
      {events.map((event, i) => {
        return (
          <EventWrapper 
            isLast={i === events.length - 1} 
            key={i}
          >
            {(i !== events.length - 1 && events.length > 1) && <Line />}
            <Dot />
            <Time>
              <Text>{feedDate(event.created_at).split(", ")[0]}</Text>
              <Text>{feedDate(event.created_at).split(", ")[1]}</Text>
            </Time>
            <EventCard event={event} i={i} />
          </EventWrapper>
        );
      })}
    </StyledActivityFeed>
  );
};

export default ActivityFeed;

const Time = styled.div`
  margin-right: -5px;
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
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
  margin-bottom: ${props => props.isLast ? "" : "25px"};
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