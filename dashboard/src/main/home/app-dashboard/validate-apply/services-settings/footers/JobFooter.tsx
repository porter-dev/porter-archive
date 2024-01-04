import React from "react";
import _ from "lodash";
import styled from "styled-components";

import Button from "components/porter/Button";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";

import { useLatestRevision } from "../../../app-view/LatestRevisionContext";
import TriggerJobButton from "../../jobs/TriggerJobButton";

type JobFooterProps = {
  jobName: string;
};
const ServiceStatusFooter: React.FC<JobFooterProps> = ({ jobName }) => {
  const { latestProto, projectId, clusterId, deploymentTarget, appName } =
    useLatestRevision();

  return (
    <StyledStatusFooter>
      <Container row>
        <Link to={`/apps/${latestProto.name}/job-history?service=${jobName}`}>
          <Button
            onClick={() => {}}
            height="30px"
            width="87px"
            color="#ffffff11"
            withBorder
          >
            <I className="material-icons">open_in_new</I>
            History
          </Button>
        </Link>
        <Spacer inline x={1} />
        <TriggerJobButton
          projectId={projectId}
          clusterId={clusterId}
          appName={appName}
          jobName={jobName}
          deploymentTargetId={deploymentTarget.id}
        />
      </Container>
    </StyledStatusFooter>
  );
};

export default ServiceStatusFooter;

const I = styled.i`
  font-size: 14px;
  margin-right: 5px;
`;

const StyledStatusFooter = styled.div`
  width: 100%;
  padding: 10px 15px;
  background: ${(props) => props.theme.fg2};
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  border: 1px solid #494b4f;
  border-top: 0;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  flex-direction: row;
  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
