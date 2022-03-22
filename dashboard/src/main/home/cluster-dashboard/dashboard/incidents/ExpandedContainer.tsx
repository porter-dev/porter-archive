import Description from "components/Description";
import Heading from "components/form-components/Heading";
import React from "react";
import styled from "styled-components";
import { IncidentContainerEvent } from "./IncidentPage";

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

const StyledCard = styled.div`
  display: grid;
  grid-row-gap: 15px;
  grid-template-columns: 1;
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
