import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import { useHistory, useLocation, useRouteMatch } from "react-router";

import {
  ChartType,
  StorageType,
} from "shared/types";
import api from "shared/api";
import { pushFiltered } from "shared/routing";
import ExpandedJobChart from "./ExpandedJobChart";
import ExpandedChart from "./ExpandedChart";
import Loading from "components/Loading";
import PageNotFound from "components/PageNotFound";
import { useWebsockets } from "shared/hooks/useWebsockets";


type Props = {
  setSidebar: (x: boolean) => void;
  isMetricsInstalled: boolean;
}

const ExpandedChartWrapper: React.FunctionComponent<Props> = ({ setSidebar, isMetricsInstalled }) => {
  // Router based state
  const location = useLocation();
  const history = useHistory();
  const { params: {baseRoute, namespace, chartName}} = useRouteMatch<{baseRoute: string, namespace: string, chartName: string}>();

  // Context hooks
  const { currentCluster, currentProject} = useContext(Context)

  // Component state  
  const [revisions, setRevisions] = useState<ChartType[]>([]);
  const [currentChart, setCurrentChart] = useState<ChartType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Websocket hook
  const { newWebsocket, openWebsocket, closeAllWebsockets, closeWebsocket } = useWebsockets();
  
  useEffect(() => {
    getRevisions()
    .then(() => {
      connectToChartLiveUpdates();
      setIsLoading(false);
    })

    return () => closeAllWebsockets();
  }, [currentCluster.id, currentProject.id])


  useEffect(() => {
    setCurrentChart(revisions[0])
  }, [revisions])

  const getRevisions = async () => {
    try {
      if (currentProject && currentCluster) {
        const res = await api.getRevisions(
          "<token>",
            {
              namespace: namespace,
              cluster_id: currentCluster.id,
              storage: StorageType.Secret,
            },
            { id: currentProject.id, name: chartName }
        );

        res.data.sort((a: ChartType, b: ChartType) => {
          return -(a.version - b.version);
        });

        setRevisions(res.data);
      }
    } catch (error) {
      console.log("err", error.response.data);      
    }
  }

  const connectToChartLiveUpdates = () => {
    const apiPath = `/api/projects/${currentProject.id}/k8s/helm_releases?cluster_id=${currentCluster.id}&charts=${chartName}`;

    const wsConfig = {
      onopen: () => console.log("connected to live chart updates websocket"),
      onmessage: (evt: MessageEvent) => {
        const event = JSON.parse(evt.data);
        // We ignore ADD events as the initial fetch of revisions will get all of those
        if (event.event_type === "UPDATE") {
          const object = event.Object as ChartType;
          setRevisions((oldRevisions) => {
            // Copy old array to clean up references
            const prevRevisions = [...oldRevisions];
            
            // Check if it's an update of a revision or if it's a new one
            const revisionIndex = prevRevisions.findIndex((rev) => {
              if (rev.version === object.version) {
                return true;
              }
            });

            // Place new one at top of the array or update the old one
            if (revisionIndex > -1) {
              prevRevisions.splice(revisionIndex, 1, object);
            } else {
              return [object, ...prevRevisions];
            }

            return prevRevisions;
          })
        }
      },
      onclose: () => console.log("closing live chart updates websocket"),
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(chartName);
      }
    }

    newWebsocket(chartName, apiPath, wsConfig);
    openWebsocket(chartName);
  }


  if (isLoading) {
    return <Loading />;
  } else if (currentChart && baseRoute === "jobs") {
    return (
      <ExpandedJobChart
        namespace={namespace}
        currentChart={currentChart}
        currentCluster={currentCluster}
        closeChart={() =>
          pushFiltered({location, history}, "/jobs", ["project_id"], {
            cluster: currentCluster.name,
            namespace: namespace,
          })
        }
        setSidebar={setSidebar}
      />
    );
  } else if (currentChart && baseRoute === "applications") {
    return (
      <ExpandedChart
        namespace={namespace}
        isMetricsInstalled={isMetricsInstalled}
        currentChart={currentChart}
        currentCluster={currentCluster}
        closeChart={() =>
          pushFiltered({location, history}, "/applications", ["project_id"], {
            cluster: currentCluster.name,
            namespace: namespace,
          })
        }
        setSidebar={setSidebar}
      />
    );
  }
  return <PageNotFound />;
}

export default ExpandedChartWrapper;
