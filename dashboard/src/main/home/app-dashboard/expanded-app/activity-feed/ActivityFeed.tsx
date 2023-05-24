import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import Text from "components/porter/Text";
import Container from "components/porter/Container";

import EventCard from "./EventCard";

type Props = {
  chart: any;
};

const dummyEvents = [
  {
    "id": 0,
    "status": "SUCCESS",
    "type": "BUILD",
    "type_external_source": "GITHUB",
    "created_at": "",
    "updated_at": "",
    "porter_app_id": 0,
    "metadata": {
      // keys depend on "type". See below
    }
  },
  {
    "id": 0,
    "status": "FAILED",
    "type": "DEPLOY",
    "type_external_source": "KUBERNETES",
    "created_at": "",
    "updated_at": "",
    "porter_app_id": 0,
    "metadata": {
      // keys depend on "type". See below
    }
  },
  {
    "id": 0,
    "status": "PROGRESSING",
    "type": "PRE_DEPLOY",
    "type_external_source": "KUBERNETES",
    "created_at": "",
    "updated_at": "",
    "porter_app_id": 0,
    "metadata": {
      // keys depend on "type". See below
    }
  },
  {
    "id": 0,
    "status": "FAILED",
    "type": "APP_EVENT",
    "type_external_source": "KUBERNETES",
    "created_at": "",
    "updated_at": "",
    "porter_app_id": 0,
    "metadata": {
      // keys depend on "type". See below
    }
  },
]

const ActivityFeed: React.FC<Props> = ({
  chart,
}) => {
  const { currentProject, currentCluster } = useContext(Context);

  useEffect(() => {
    // Do something
  }, []);

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
            <Time>
              <Text>Jun 16</Text>
              <Text>12:00 PM</Text>
            </Time>
            <EventCard event={event} />
          </EventWrapper>
        );
      })}
    </StyledActivityFeed>
  );
};

export default ActivityFeed;

const Time = styled.div`
  margin-right: -5px;
`;

const Line = styled.div`
  width: 1px;
  height: calc(100% + 30px);
  background: #414141;
  position: absolute;
  left: 3px;
  top: 36px;
  opacity: 1;
`;

const Dot = styled.div`
  width: 7px;
  height: 7px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  left: 0;
  top: 36px;
  opacity: 1;
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
`;