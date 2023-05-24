import React from "react";
import styled from "styled-components";

import app_event from "assets/app_event.png";
import build from "assets/build.png";
import deploy from "assets/deploy.png";
import pre_deploy from "assets/pre_deploy.png";
import loading from "assets/loading.gif";
import healthy from "assets/status-healthy.png";
import failure from "assets/failure.png";
import run_for from "assets/run_for.png";
import refresh from "assets/refresh.png";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Link from "components/porter/Link";
import Icon from "components/porter/Icon";

type Props = {
  event: any;
};

const EventCard: React.FC<Props> = ({
  event,
}) => {
  const getIcon = (eventType: string) => {
    switch (eventType) {
      case "APP_EVENT":
        return app_event;
      case "BUILD":
        return build;
      case "DEPLOY":
        return deploy;
      case "PRE_DEPLOY":
        return pre_deploy;
      default:
        return app_event;
    };
  };

  const getTitle = (eventType: string) => {
    switch (eventType) {
      case "APP_EVENT":
        return "Some application event";
      case "BUILD":
        return "Application build";
      case "DEPLOY":
        return "Application deploy";
      case "PRE_DEPLOY":
        return "Application pre-deploy";
      default:
        return "";
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return healthy;
      case "FAILED":
        return failure;
      case "PROGRESSING":
        return loading;
      default:
        return loading;
    };
  };

  const renderStatusText = (event: any) => {
    if (event.type === "BUILD") {
      switch (event.status) {
        case "SUCCESS":
          return <Text color="#68BF8B">Build succeeded</Text>
        case "FAILED":
          return <Text color="#FF6060">Build failed</Text>
        default:
          return <Text color="#aaaabb66">Build in progress . . </Text>
      };
    };
    
    if (event.type === "DEPLOY") {
      switch (event.status) {
        case "SUCCESS":
          return <Text color="#68BF8B">Deployed v100</Text>
        case "FAILED":
          return <Text color="#FF6060">Deploying v100 failed</Text>
        default:
          return <Text color="#aaaabb66">Deploying v100 . . .</Text>
      };
    };
    
    if (event.type === "PRE_DEPLOY") {
      switch (event.status) {
        case "SUCCESS":
          return <Text color="#68BF8B">Pre-deploy succeeded . . </Text>
        case "FAILED":
          return <Text color="#FF6060">Pre-deploy failed . . </Text>
        default:
          return <Text color="#aaaabb66">Pre-deploy in progress . . </Text>
      };
    };
  };

  const renderInfoCta = (event: any) => {
    if (event.type === "APP_EVENT") {
      return (
        <>
          <Link hasunderline onClick={() => alert("TODO: open details modal")}>View details</Link>
          <Spacer inline x={1} />
        </>
      );
    };

    if (event.type === "BUILD") {
      switch (event.status) {
        case "SUCCESS":
          return (
            <>
              <Link hasunderline onClick={() => alert("TODO: open GHA logs modal")}>View logs</Link>
              <Spacer inline x={1} />
            </>
          );
        case "FAILED":
          return (
            <>
              <Link hasunderline onClick={() => alert("TODO: open GHA logs modal")}>View logs</Link>
              <Spacer inline x={1} />
            </>
          );
        default:
          return (
            <>
              <Link hasunderline onClick={() => alert("TODO: link to GHA")}>View live logs</Link>
              <Spacer inline x={1} />
            </>
          );
      };
    };
    
    if (event.type === "DEPLOY") {
      if (event.type === "FAILED") {
        return (
          <>
            <Link hasunderline onClick={() => alert("TODO: open deploy logs modal")}>View logs</Link>
            <Spacer inline x={1} />
          </>
        );
      } else {
        return;
      };
    };
    
    if (event.type === "PRE_DEPLOY") {
      return (
        <>
          <Link hasunderline onClick={() => alert("TODO: open logs modal")}>View logs</Link>
          <Spacer inline x={1} />
        </>
      );
    };
  };

  return (
    <StyledEventCard>
      <Container row spaced>
        <Container row>
          <Icon height="18px" src={getIcon(event.type)} />
          <Spacer inline width="10px" />
          <Text size={14}>{getTitle(event.type)}</Text>
        </Container>
        <Container row>
          <Icon height="14px" src={run_for} />
          <Spacer inline width="6px" />
          <Text color="helper">1h 2m</Text>
        </Container>
      </Container>
      <Spacer y={1} />
      <Container row spaced>
        <Container row>
          {event.type !== "APP_EVENT" && (
            <>
              <Icon height="18px" src={getStatusIcon(event.status)} />
              <Spacer inline width="10px" />
            </>
          )}
          {renderStatusText(event)}
          {event.type !== "APP_EVENT" && (
            <Spacer inline x={1} />
          )}
          {renderInfoCta(event)}
          {event.status === "FAILED" && event.type !== "APP_EVENT" && (
            <>
              <Link hasunderline>
                <Container row>
                  <Icon height="10px" src={refresh} />
                  <Spacer inline width="5px" />
                  Retry
                </Container>
              </Link>
            </>
          )}
        </Container>
        {false && (
          <Text color="helper">user@email.com</Text>
        )}
      </Container>
    </StyledEventCard>
  );
};

export default EventCard;

const StyledEventCard = styled.div`
  width: 100%;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 85px;
  border-radius: 5px;
  background: ${({ theme }) => theme.fg};
  border: 1px solid ${({ theme }) => theme.border};
`;