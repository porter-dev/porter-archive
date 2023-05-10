import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import VerticalSteps from "components/porter/VerticalSteps";

type Props = {
  chart: any;
};

const dummyEvents = [
  {
    type: "build",
  },
  {
    type: "deploy",
  }
]

const ActivityFeed: React.FC<Props> = ({
  chart,
}) => {
  const { currentProject, currentCluster } = useContext(Context);

  useEffect(() => {
    // Do something
  }, []);

  const renderEvent = (event: any) => {
    return (
      <EventCard>
        some event
      </EventCard>
    )
  };

  return (
    <StyledActivityFeed>
      {dummyEvents.map((event, i) => {
        return (
          <EventWrapper 
            isLast={i === dummyEvents.length - 1} 
            key={i}
          >
            {(i !== dummyEvents.length - 1) && <Line />}
            <Dot />
            {renderEvent(event)}
          </EventWrapper>
        );
      })}
    </StyledActivityFeed>
  );
};

export default ActivityFeed;

const EventCard = styled.div`
  width: 100%;
  padding: 20px;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid ${({ theme }) => theme.border};
`;

const Line = styled.div`
  width: 1px;
  height: calc(100% + 35px);
  background: #414141;
  position: absolute;
  left: 3px;
  top: 8px;
  opacity: 1;
`;

const Dot = styled.div`
  width: 7px;
  height: 7px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  left: 0;
  top: 7px;
  opacity: 1;
`;

const EventWrapper = styled.div<{
  isLast: boolean;
}>`
  padding-left: 30px;
  position: relative;
  margin-bottom: ${props => props.isLast ? "" : "25px"};
`;

const StyledActivityFeed = styled.div`
  width: 100%;
`;