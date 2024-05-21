import { useEffect, useState } from "react";
import api from "shared/api";
import { NewWebsocketOptions, useWebsockets } from "./useWebsockets";

interface Props {
  selectors: string[];
  namespace: string;
  project_id: number;
  cluster_id: number;
  controller_kind?: string;
  controller_name?: string;
  // subscribed controls whether or not pods should be returned from this hook. for example, we
  // use this hook to query a list of job runs, but only want to return pods (and live status)
  // for job runs which are currently active. as we don't want to mess with conditional hooks,
  // we simply toggle "subscribed" instead
  subscribed?: boolean;
}

type UsePods = (props: Props) => [pods: any[], isLoading: boolean];

export const usePods: UsePods = ({
  selectors,
  namespace,
  project_id,
  cluster_id,
  controller_kind,
  controller_name,
  subscribed,
}) => {
  const [pods, setPods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const setupWebsocket = () => {
    let apiEndpoint = `/api/projects/${project_id}/clusters/${cluster_id}/pod/status?`;

    if (selectors) {
      for (let selector of selectors) {
        apiEndpoint += `selectors=${selector}`;
      }
    }

    const options: NewWebsocketOptions = {};

    options.onopen = () => {
      console.log("connected to websocket");
    };

    options.onmessage = (evt: MessageEvent) => {
      let event = JSON.parse(evt.data);
      let object = event.Object;
      object.metadata.kind = event.Kind;

      mergeAndUpdatePods(object);
    };

    options.onclose = () => {
      console.log("closing websocket");
    };

    options.onerror = (err: ErrorEvent) => {
      console.log(err);
      closeWebsocket(apiEndpoint);
    };

    newWebsocket(apiEndpoint, apiEndpoint, options);
    openWebsocket(apiEndpoint);
  };

  const mergeAndUpdatePods = (pod: any) => {
    // find pods with the same name and namespace and overwrite them
    let newPods = [...pods];
    let assigned = false;

    newPods.forEach((newPod, i) => {
      if (
        newPod.metadata.name == pod.metadata.name &&
        newPod.metadata.namespace == pod.metadata.namespace
      ) {
        newPods[i] = pod;
        assigned = true;
      }
    });

    if (!assigned) {
      newPods = [...newPods, pod];
    }

    setPods(newPods);
  };

  useEffect(() => {
    if (!subscribed) {
      return;
    }
    setIsLoading(true);
    if (controller_kind == "job") {
      api
        .getJobPods(
          "<token>",
          {},
          {
            id: project_id,
            name: controller_name,
            cluster_id: cluster_id,
            namespace: namespace,
          }
        )
        .then((res) => {
          setPods(res.data);
          setIsLoading(false);
        });
    } else {
      api
        .getMatchingPods(
          "<token>",
          {
            namespace: namespace,
            selectors: selectors,
          },
          {
            id: project_id,
            cluster_id: cluster_id,
          }
        )
        .then((res) => {
          setPods(res.data);
        });
    }

    setupWebsocket();

    return () => closeAllWebsockets();
  }, [project_id, cluster_id]);

  return [pods, isLoading];
};
