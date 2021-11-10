import { unionBy } from "lodash";
import { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { KubeEvent } from "shared/types";

export const useKubeEvents = (
  resourceType: "NODE" | "POD" | "HPA",
  ownerName?: string,
  ownerType?: string
) => {
  const { currentCluster, currentProject } = useContext(Context);
  const [hasPorterAgent, setHasPorterAgent] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [kubeEvents, setKubeEvents] = useState<KubeEvent[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Check if the porter agent is installed or not
  useEffect(() => {
    let isSubscribed = true;

    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    api
      .detectPorterAgent("<token>", {}, { project_id, cluster_id })
      .then(() => {
        setHasPorterAgent(true);
      })
      .catch(() => {
        setHasPorterAgent(false);
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, currentCluster]);

  // Get events
  useEffect(() => {
    let isSubscribed = true;
    if (hasPorterAgent) {
      fetchData(true).then(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });
    }

    return () => {
      isSubscribed = false;
    };
  }, [
    currentProject?.id,
    currentCluster?.id,
    hasPorterAgent,
    resourceType,
    ownerType,
    ownerName,
  ]);

  const fetchData = async (clear?: boolean) => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;
    let skipBy;
    if (!clear) {
      skipBy = kubeEvents?.length;
    } else {
      setHasMore(true);
    }

    const type = resourceType;

    try {
      const data = await api
        .getKubeEvents(
          "<token>",
          {
            skip: skipBy,
            resource_type: type,
            owner_name: ownerName,
            owner_type: ownerType,
          },
          { project_id, cluster_id }
        )
        .then((res) => res.data);

      const newKubeEvents = data?.kube_events;
      const totalCount = data?.count;

      setTotalCount(totalCount);

      if (!newKubeEvents?.length) {
        setHasMore(false);
        return;
      }

      if (clear) {
        setKubeEvents(newKubeEvents);

        if (totalCount === newKubeEvents.length) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        return;
      }

      const newEvents = unionBy(kubeEvents, newKubeEvents, "id");

      if (totalCount === newEvents.length) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setKubeEvents(newEvents);
    } catch (error) {
      console.log(error);
    }
  };

  const installPorterAgent = () => {
    const project_id = currentProject?.id;
    const cluster_id = currentCluster?.id;

    api
      .installPorterAgent("<token>", {}, { project_id, cluster_id })
      .then(() => {
        setHasPorterAgent(true);
      })
      .catch(() => {
        setHasPorterAgent(false);
      });
  };

  const getLastSubEvent = (
    subEvents: {
      event_type: string;
      message: string;
      reason: string;
      timestamp: string;
    }[]
  ) => {
    const sortedEvents = subEvents
      .map((s) => {
        return {
          ...s,
          timestamp: new Date(s.timestamp).getTime(),
        };
      })
      .sort((prev, next) => next.timestamp - prev.timestamp);

    return sortedEvents[0];
  };

  // Fill up the data missing on events with the subevents
  const processedKubeEvents = useMemo(() => {
    return kubeEvents
      .map((e: any) => {
        const lastSubEvent = getLastSubEvent(e.sub_events);

        return {
          ...e,
          event_type: lastSubEvent.event_type,
          timestamp: new Date(lastSubEvent.timestamp).getTime(),
          last_message: lastSubEvent.message,
        };
      })
      .sort((prev, next) => next.timestamp - prev.timestamp)
      .map((s) => ({
        ...s,
        timestamp: new Date(s.timestamp).toUTCString(),
      }));
  }, [kubeEvents]);

  return {
    hasPorterAgent,
    isLoading,
    kubeEvents: processedKubeEvents,
    hasMore,
    totalCount,
    loadMoreEvents: () => fetchData(),
    triggerInstall: installPorterAgent,
  };
};
