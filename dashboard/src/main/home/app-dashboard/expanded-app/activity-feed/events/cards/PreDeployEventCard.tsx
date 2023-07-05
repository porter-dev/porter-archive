import React, { useState } from "react";
import styled from "styled-components";

import pre_deploy from "assets/pre_deploy.png";

import run_for from "assets/run_for.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Icon from "components/porter/Icon";

import { getDuration, getStatusIcon, triggerWorkflow } from '../utils';
import { StyledEventCard } from "./EventCard";
import Link from "components/porter/Link";
import document from "assets/document.svg";
import { PorterAppEvent } from "../types";

type Props = {
  event: PorterAppEvent;
  appData: any;
};

const PreDeployEventCard: React.FC<Props> = ({ event, appData }) => {
  const renderStatusText = (event: PorterAppEvent) => {
    switch (event.status) {
      case "SUCCESS":
        return <Text color="#68BF8B">Pre-deploy succeeded</Text>;
      case "FAILED":
        return <Text color="#FF6060">Pre-deploy failed</Text>;
      default:
        return <Text color="#aaaabb66">Pre-deploy in progress...</Text>;
    }
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={pre_deploy} />
          <Spacer inline width="10px" />
          <Text>Application pre-deploy</Text>
        </Container>
        <Container row>
          <Icon height="14px" src={run_for} />
          <Spacer inline width="6px" />
          <Text color="helper">{getDuration(event)}</Text>
        </Container>
      </Container>
      <Spacer y={0.5} />
      <Container row spaced>
        <Container row>
          <Icon height="16px" src={getStatusIcon(event.status)} />
          <Spacer inline width="10px" />
          {renderStatusText(event)}
          {(event.status !== "SUCCESS") &&
            <>
              <Spacer inline x={1} />
              <Wrapper>
                <Link to={`/apps/${appData.app.name}/events/${event.id}`} hasunderline>
                  <Container row>
                    <Icon src={document} height="10px" />
                    <Spacer inline width="5px" />
                    View details
                  </Container>
                </Link>
                <Spacer inline x={1} />
                <Link hasunderline onClick={() => triggerWorkflow(appData)}>
                  <Container row>
                    <Icon height="10px" src={refresh} />
                    <Spacer inline width="5px" />
                    Retry
                  </Container>
                </Link>
              </Wrapper>
            </>
          }
          <Spacer inline x={1} />
        </Container>
      </Container>
    </StyledEventCard>
  );
};

export default PreDeployEventCard;

const Wrapper = styled.div`
  margin-top: -3px;
`;