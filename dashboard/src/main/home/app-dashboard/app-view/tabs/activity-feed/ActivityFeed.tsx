import React, { useEffect, useState } from "react";
import styled from "styled-components";

import api from "shared/api";

import Text from "components/porter/Text";

import EventCard from "./events/cards/EventCard";
import Loading from "components/Loading";
import Spacer from "components/porter/Spacer";
import Fieldset from "components/porter/Fieldset";

import { feedDate } from "shared/string_utils";
import Pagination from "components/porter/Pagination";
import _ from "lodash";
import Button from "components/porter/Button";
import { PorterAppEvent, porterAppEventValidator } from "./events/types";
import { z } from "zod";

type Props = {
    appName: string;
    currentProject: number;
    currentCluster: number;
    deploymentTargetId: string;
};

const EVENTS_POLL_INTERVAL = 5000; // poll every 5 seconds

const ActivityFeed: React.FC<Props> = ({ appName, deploymentTargetId, currentCluster, currentProject }) => {
    const [events, setEvents] = useState<PorterAppEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasError, setHasError] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [numPages, setNumPages] = useState<number>(0);
    const [hasPorterAgent, setHasPorterAgent] = useState(false);
    const [isPorterAgentInstalling, setIsPorterAgentInstalling] = useState(false);
    const [shouldAnimate, setShouldAnimate] = useState(true);

    const getEvents = async () => {
        setLoading(true)
        try {
            const res = await api.appEvents(
                "<token>",
                {
                    deployment_target_id: deploymentTargetId,
                    page
                },
                {
                    cluster_id: currentCluster,
                    project_id: currentProject,
                    porter_app_name: appName,
                }
            );

            setNumPages(res.data.num_pages);
            const events = z.array(porterAppEventValidator).optional().default([]).parse(res.data.events);
            setEvents(events);
            setHasError(false)
        } catch (err) {
            setHasError(true);
            console.log(err);
        } finally {
            setLoading(false);
            setShouldAnimate(false);
        }
    };

    const getLatestDeployEventIndex = () => {
        const deployEvents = events.filter((event) => event.type === 'DEPLOY');
        if (deployEvents.length === 0) {
            return -1;
        }
        return events.indexOf(deployEvents[0]);
    };

    const updateEvents = async () => {
        try {
            const res = await api.appEvents(
                "<token>",
                {
                    deployment_target_id: deploymentTargetId,
                    page
                },
                {
                    cluster_id: currentCluster,
                    project_id: currentProject,
                    porter_app_name: appName,
                }
            );
            setHasError(false)
            setNumPages(res.data.num_pages);
            const events = z.array(porterAppEventValidator).optional().default([]).parse(res.data.events);
            setEvents(events);
        } catch (err) {
            setHasError(true);
        }
    }

    useEffect(() => {
        const checkForAgent = async () => {
            try {
                const project_id = currentProject;
                const cluster_id = currentCluster;
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
            const intervalId = setInterval(updateEvents, EVENTS_POLL_INTERVAL);
            getEvents();
            return () => clearInterval(intervalId);
        }

    }, [currentProject, currentCluster, hasPorterAgent, page]);

    const installAgent = async () => {
        const project_id = currentProject;
        const cluster_id = currentCluster;

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

    if (hasError) {
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

    if (!loading && !hasPorterAgent) {
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
                <Text size={16}>No events found for "{appName}"</Text>
                <Spacer height="15px" />
                <Text color="helper">
                    This application currently has no associated events.
                </Text>
            </Fieldset>
        );
    }

    return (
        <StyledActivityFeed shouldAnimate={shouldAnimate}>
            {events.map((event, i) => {
                return (
                    <EventWrapper isLast={i === events.length - 1} key={i}>
                        {i !== events.length - 1 && events.length > 1 && <Line shouldAnimate={shouldAnimate} />}
                        <Dot shouldAnimate={shouldAnimate} />
                        <Time shouldAnimate={shouldAnimate}>
                            <Text>{feedDate(event.created_at).split(", ")[0]}</Text>
                            <Spacer x={0.5} />
                            <Text>{feedDate(event.created_at).split(", ")[1]}</Text>
                        </Time>
                        <EventCard
                            deploymentTargetId={deploymentTargetId}
                            event={event}
                            key={i}
                            isLatestDeployEvent={i === getLatestDeployEventIndex()}
                            projectId={currentProject}
                            clusterId={currentCluster}
                            appName={appName}
                        />
                    </EventWrapper>
                );
            })}
            {numPages > 1 && (
                <>
                    <Spacer y={1} />
                    <Pagination page={page} setPage={setPage} totalPages={numPages} />
                </>
            )}
        </StyledActivityFeed>
    );
};

export default ActivityFeed;

const I = styled.i`
  font-size: 14px;
  margin-right: 5px;
`;

const Time = styled.div<{ shouldAnimate: boolean }>`
  opacity: ${(props) => props.shouldAnimate ? "0" : "1"};
  ${(props) => props.shouldAnimate && "animation: fadeIn 0.3s 0.1s;"}
  ${(props) => props.shouldAnimate && "animation-fill-mode: forwards;"}
  width: 90px;
`;

const Line = styled.div<{ shouldAnimate: boolean }>`
  width: 1px;
  height: calc(100% + 30px);
  background: #414141;
  position: absolute;
  left: 3px;
  top: 36px;
  opacity: ${(props) => props.shouldAnimate ? "0" : "1"};
  ${(props) => props.shouldAnimate && "animation: fadeIn 0.3s 0.1s;"}
  ${(props) => props.shouldAnimate && "animation-fill-mode: forwards;"}
`;

const Dot = styled.div<{ shouldAnimate: boolean }>`
  width: 7px;
  height: 7px;
  background: #fff;
  border-radius: 50%;
  margin-left: -29px;
  margin-right: 20px;
  z-index: 1;
  opacity: ${(props) => props.shouldAnimate ? "0" : "1"};
  ${(props) => props.shouldAnimate && "animation: fadeIn 0.3s 0.1s;"}
  ${(props) => props.shouldAnimate && "animation-fill-mode: forwards;"}
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

const StyledActivityFeed = styled.div<{ shouldAnimate: boolean }>`
  width: 100%;
  ${(props) => props.shouldAnimate && "animation: fadeIn 0.3s 0s;"}
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
