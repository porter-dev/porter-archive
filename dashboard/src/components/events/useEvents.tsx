import { unionBy } from "lodash";
import { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { KubeEvent } from "shared/types";

export const useKubeEvents = (resourceType: "NODE" | "POD" | "HPA") => {
  const { currentCluster, currentProject } = useContext(Context);
  const [hasPorterAgent, setHasPorterAgent] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [kubeEvents, setKubeEvents] = useState<KubeEvent[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

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
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, currentCluster]);

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
  }, [currentProject?.id, currentCluster?.id, hasPorterAgent, resourceType]);

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
          { skip: skipBy, resource_type: type },
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
      } else {
        const newEvents = unionBy(kubeEvents, newKubeEvents, "id");
        setKubeEvents(newEvents);
        if (newEvents.length === kubeEvents?.length) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
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

  return {
    hasPorterAgent,
    isLoading,
    kubeEvents,
    hasMore,
    totalCount,
    loadMoreEvents: () => fetchData(),
    triggerInstall: installPorterAgent,
  };
};
