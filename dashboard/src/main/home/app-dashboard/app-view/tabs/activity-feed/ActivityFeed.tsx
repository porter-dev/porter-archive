import React, { useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import _ from "lodash";
import styled from "styled-components";
import { z } from "zod";

import Loading from "components/Loading";
import Button from "components/porter/Button";
import Fieldset from "components/porter/Fieldset";
import Pagination from "components/porter/Pagination";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type DeploymentTarget } from "lib/hooks/useDeploymentTarget";
import { formattedPath } from "lib/porter-apps/routing";

import api from "shared/api";
import { Context } from "shared/Context";
import { feedDate } from "shared/string_utils";

import EventCard from "./events/cards/EventCard";
import { porterAppEventValidator, type PorterAppEvent } from "./events/types";

type Props = {
  appName: string;
  projectId: number;
  clusterId: number;
  deploymentTarget: DeploymentTarget;
};

const EVENTS_POLL_INTERVAL = 5000; // poll every 5 seconds

const ActivityFeed: React.FC<Props> = ({
  appName,
  deploymentTarget,
  clusterId,
  projectId,
}) => {
  const [events, setEvents] = useState<PorterAppEvent[] | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [hasPorterAgent, setHasPorterAgent] = useState<boolean | undefined>(
    undefined
  );
  const [isPorterAgentInstalling, setIsPorterAgentInstalling] = useState(false);

  const { currentProject } = useContext(Context);

  const {
    data: eventFetchData,
    isLoading: isEventFetchLoading,
    isRefetching,
  } = useQuery(
    ["appEvents", deploymentTarget.id, page],
    async () => {
      const res = await api.appEvents(
        "<token>",
        {
          deployment_target_id: deploymentTarget.id,
          page,
        },
        {
          cluster_id: clusterId,
          project_id: projectId,
          porter_app_name: appName,
        }
      );

      const parsed = await z
        .object({
          events: z.array(porterAppEventValidator).optional().default([]),
          num_pages: z.number(),
        })
        .parseAsync(res.data);
      return { events: parsed.events, pages: parsed.num_pages };
    },
    {
      enabled: hasPorterAgent,
      refetchInterval: EVENTS_POLL_INTERVAL,
    }
  );
  useEffect(() => {
    if (eventFetchData != null || isRefetching) {
      if (eventFetchData) {
        setEvents(eventFetchData.events);
        setNumPages(eventFetchData.pages);
      }
    }
  }, [eventFetchData, isRefetching]);

  const getLatestDeployEventIndex = (): number => {
    if (events == null) {
      return -1;
    }
    const deployEvents = events.filter((event) => event.type === "DEPLOY");
    if (deployEvents.length === 0) {
      return -1;
    }
    return events.indexOf(deployEvents[0]);
  };

  const { data: porterAgentCheck, isLoading: porterAgentCheckLoading } =
    useQuery(
      ["detectPorterAgent", projectId, clusterId],
      async () => {
        const res = await api.detectPorterAgent(
          "<token>",
          {},
          { project_id: projectId, cluster_id: clusterId }
        );
        // response will either have version key if porter agent found, or error key if not
        const parsed = await z
          .object({ version: z.string().optional() })
          .parseAsync(res.data);
        return parsed.version === "v3";
      },
      {
        enabled: !hasPorterAgent,
        retry: (_, error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            setHasPorterAgent(false);
          }
          return false;
        },
        refetchOnWindowFocus: false,
      }
    );
  useEffect(() => {
    if (porterAgentCheck != null) {
      setHasPorterAgent(porterAgentCheck);
    }
  }, [porterAgentCheck]);

  const installAgent = async (): Promise<void> => {
    setIsPorterAgentInstalling(true);
    try {
      await api.installPorterAgent(
        "<token>",
        {},
        { project_id: projectId, cluster_id: clusterId }
      );
      window.location.reload();
    } catch (err) {
      setIsPorterAgentInstalling(false);
    }
  };

  if (isPorterAgentInstalling) {
    return (
      <Fieldset>
        <Text size={16}>Installing agent...</Text>
        <Spacer y={0.5} />
        <Text color="helper">
          If you are not redirected automatically after a minute, you may need
          to refresh this page.
        </Text>
      </Fieldset>
    );
  }

  if (isEventFetchLoading || porterAgentCheckLoading || events == null) {
    return (
      <div>
        <Spacer y={2} />
        <Loading />
      </div>
    );
  }

  if (hasPorterAgent != null && !hasPorterAgent) {
    return (
      <Fieldset>
        <Text size={16}>
          {"We couldn't detect the Porter agent on your cluster"}
        </Text>
        <Spacer y={0.5} />
        <Text color="helper">
          In order to use the Activity tab, you need to install the Porter
          agent.
        </Text>
        <Spacer y={1} />
        <Button
          onClick={async () => {
            await installAgent();
          }}
        >
          <I className="material-icons">add</I> Install Porter agent
        </Button>
      </Fieldset>
    );
  }

  // if all the events are hidden and there's only one page, show this no-events-found message
  // else, users should be able to go to the next page for events
  if (events != null && events.length === 0 && numPages <= 1) {
    return (
      <Fieldset>
        <Text size={16}>No events found for &ldquo;{appName}&rdquo;</Text>
        <Spacer height="15px" />
        <Text color="helper">
          This application currently has no associated events.
        </Text>
      </Fieldset>
    );
  }

  return (
    <StyledActivityFeed>
      {events.map((event, i) => {
        return (
          <EventWrapper isLast={i === events.length - 1} key={i}>
            {i !== events.length - 1 && events.length > 1 && <Line />}
            <Dot />
            <Time>
              <Text>{feedDate(event.created_at).split(", ")[0]}</Text>
              <Spacer x={0.5} />
              <Text>{feedDate(event.created_at).split(", ")[1]}</Text>
            </Time>
            <EventCard
              deploymentTargetId={deploymentTarget.id}
              event={event}
              key={i}
              isLatestDeployEvent={i === getLatestDeployEventIndex()}
              projectId={projectId}
              clusterId={clusterId}
              appName={appName}
              internalLinkBuilder={({ tab, queryParams }) =>
                formattedPath({
                  currentProject,
                  deploymentTarget,
                  tab,
                  appName,
                  queryParams,
                })
              }
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

const Time = styled.div`
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
  width: 90px;
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
  margin-left: -29px;
  margin-right: 20px;
  z-index: 1;
  opacity: 0;
  animation: fadeIn 0.3s 0.1s;
  animation-fill-mode: forwards;
`;

const EventWrapper = styled.div<{ isLast: boolean }>`
  padding-left: 30px;
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: ${(props) => (props.isLast ? "" : "25px")};
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
