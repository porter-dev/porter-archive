import React, { useState } from "react";
import styled from "styled-components";

import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Button from "components/porter/Button";

import AnimateHeight, { type Height } from "react-animate-height";
import _ from "lodash";
import Link from "components/porter/Link";
import { type PorterAppVersionStatus } from "lib/hooks/useAppStatus";
import { match } from "ts-pattern";
import { useLatestRevision } from "../../app-view/LatestRevisionContext";
import TriggerJobButton from "../jobs/TriggerJobButton";

type ServiceStatusFooterProps = {
    serviceName: string;
    status: PorterAppVersionStatus[];
    isJob: boolean,
}
const ServiceStatusFooter: React.FC<ServiceStatusFooterProps> = ({
    serviceName,
    status,
    isJob
}) => {
    const [expanded, setExpanded] = useState<boolean>(false);
    const { latestProto, projectId, clusterId, deploymentTarget, appName } = useLatestRevision();
    const [height, setHeight] = useState<Height>(0);

    if (isJob) {
        return (
            <StyledStatusFooter>

                <Container row>
                    {/*
            <Mi className="material-icons">check</Mi>
            <Text color="helper">
              Last run succeeded at 12:39 PM on 4/13/23
            </Text>
            */}
                    <Link to={`/apps/${latestProto.name}/job-history?service=${serviceName}`}>
                        <Button
                            onClick={() => { }}
                            height="30px"
                            width="87px"
                            color="#ffffff11"
                            withBorder
                        >
                            <I className="material-icons">open_in_new</I>
                            History
                        </Button>
                    </Link>
                    <TriggerJobButton projectId={projectId} clusterId={clusterId} appName={appName} jobName={serviceName} deploymentTargetId={deploymentTarget.id} />
                </Container>

            </StyledStatusFooter>
        );
    }

    return (
        <>
            {status.map((versionStatus, i) => {
                return (
                    <div key={i}>
                        <StyledStatusFooterTop expanded={expanded}>
                            <StyledContainer row spaced>
                                {match(versionStatus)
                                    .with({ status: "failing" }, (vs) => {
                                        return (
                                            <>
                                                <Running>
                                                    <StatusDot color="#ff0000" />
                                                    <Text color="helper">
                                                        {vs.message}
                                                    </Text>
                                                </Running>
                                                {vs.crashLoopReason &&
                                                    <Button
                                                        onClick={() => {
                                                            expanded ? setHeight(0) : setHeight(122);
                                                            setExpanded(!expanded);
                                                        }}
                                                        height="20px"
                                                        color="#ffffff11"
                                                        withBorder
                                                    >
                                                        {expanded ? (
                                                            <I className="material-icons">arrow_drop_up</I>
                                                        ) : (
                                                            <I className="material-icons">arrow_drop_down</I>
                                                        )}
                                                        <Text color="helper">See failure reason</Text>
                                                    </Button>
                                                }
                                            </>
                                        )
                                    })
                                    .with({ status: "spinningDown" }, (vs) => {
                                        return (
                                            <Running>
                                                <StatusDot color="#FFA500" />
                                                <Text color="helper">
                                                    {vs.message}
                                                </Text>
                                            </Running>
                                        )
                                    })
                                    .with({ status: "running" }, (vs) => {
                                        return (
                                            <Running>
                                                <StatusDot />
                                                <Text color="helper">
                                                    {vs.message}
                                                </Text>
                                            </Running>
                                        )
                                    })
                                    .exhaustive()
                                }
                            </StyledContainer>
                        </StyledStatusFooterTop>
                        {versionStatus.crashLoopReason && (
                            <AnimateHeight height={height}>
                                <StyledStatusFooter>
                                    <Message>
                                        {versionStatus.crashLoopReason}
                                    </Message>
                                </StyledStatusFooter>
                            </AnimateHeight>
                        )}
                    </div>
                );
            })}
        </>
    );
};

export default ServiceStatusFooter;

const StatusDot = styled.div<{ color?: string }>`
  min-width: 7px;
  max-width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 10px;
  background: ${(props) => props.color || "#38a88a"};

  box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
  transform: scale(1);
  animation: pulse 2s infinite;
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }

    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
  }
`;

const Mi = styled.i`
  font-size: 16px;
  margin-right: 7px;
  margin-top: -1px;
  color: rgb(56, 168, 138);
`;

const I = styled.i`
  font-size: 14px;
  margin-right: 5px;
`;

const StatusCircle = styled.div<{
    percentage?: any;
    dashed?: boolean;
}>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 10px;
  background: conic-gradient(
    from 0deg,
    #ffffff33 ${(props) => props.percentage},
    #ffffffaa 0% ${(props) => props.percentage}
  );
  border: ${(props) => (props.dashed ? "1px dashed #ffffff55" : "none")};
`;

const Running = styled.div`
  display: flex;
  align-items: center;
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

const StyledStatusFooterTop = styled(StyledStatusFooter) <{
    expanded: boolean;
}>`
  height: 40px;
  border-bottom: ${({ expanded }) => expanded && "0px"};
  border-bottom-left-radius: ${({ expanded }) => expanded && "0px"};
  border-bottom-right-radius: ${({ expanded }) => expanded && "0px"};
`;

const Message = styled.div`
  padding: 20px;
  background: #000000;
  border-radius: 5px;
  line-height: 1.5em;
  border: 1px solid #aaaabb33;
  font-family: monospace;
  font-size: 13px;
  display: flex;
  align-items: center;
  > img {
    width: 13px;
    margin-right: 20px;
  }
  width: 100%;
  height: 101px;
  overflow: hidden;
`;

const StyledContainer = styled.div<{
    row: boolean;
    spaced: boolean;
}>`
  display: ${(props) => (props.row ? "flex" : "block")};
  align-items: center;
  justify-content: ${(props) =>
        props.spaced ? "space-between" : "flex-start"};
  width: 100%;
`;
