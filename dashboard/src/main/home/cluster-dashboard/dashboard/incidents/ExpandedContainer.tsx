import Description from "components/Description";
import useLastSeenPodStatus from "components/events/useLastSeenPodStatus";
import Heading from "components/form-components/Heading";
import Loading from "components/Loading";
import { isEmpty } from "lodash";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import { IncidentContainerEvent, IncidentEvent } from "./IncidentPage";

type Props = {
  container: IncidentContainerEvent;
  logs: string;
};

const ExpandedContainer: React.FC<Props> = ({ container, logs }) => {
  return (
    <StyledCard>
      <MetadataContainer>
        <Heading>Container: {container.container_name}</Heading>
        <Description>
          Container exited with code {container.exit_code}, {container.message}
        </Description>
        <Description>
          The following are the container logs from this application instance:
        </Description>
        <LogContainer>
          {logs ? <>{logs}</> : <>No logs available for this container.</>}
        </LogContainer>
      </MetadataContainer>
    </StyledCard>
  );
};

export default ExpandedContainer;

const PorterFormContainer = styled.div`
  position: relative;
  min-width: 300px;
`;

const Br = styled.div`
  width: 100%;
  height: 20px;
`;

const StyledCard = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
`;

const BackArrowContainer = styled.div`
  width: 100%;
  height: 24px;
`;

const BackArrow = styled.div`
  > i {
    color: #aaaabb;
    font-size: 18px;
    margin-right: 6px;
  }

  color: #aaaabb;
  display: flex;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
  width: 120px;
`;

const MetadataContainer = styled.div`
  margin-bottom: 3px;
  border-radius: 6px;
  background: #2e3135;
  padding: 0 20px;
  overflow-y: auto;
  min-height: 100px;
  font-size: 13px;
  margin: 12px 0;
`;

const LogTitleContainer = styled.div`
  padding: 0 20px;
  margin-bottom: 20px;
`;

const LogSectionContainer = styled.div`
  margin-bottom: 3px;
  border-radius: 6px;
  background: #2e3135;
  overflow: hidden;
  max-height: 500px;
  font-size: 13px;
`;

const LogContainer = styled.div`
  padding: 14px;
  font-size: 13px;
  background: #121318;
  user-select: text;
  overflow-wrap: break-word;
  overflow-y: auto;
  min-height: 55px;
  color: #aaaabb;
  height: 400px;
  border-radius: 4px;
  margin: 12px 0 24px 0;
`;

const Log = styled.div`
  font-family: monospace, sans-serif;
  font-size: 12px;
  color: white;
`;
