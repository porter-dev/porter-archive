import React, { useMemo } from "react";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { ClusterList } from "main/home/infrastructure-dashboard/ClusterDashboard";
import { useClusterList } from "lib/hooks/useCluster";

import { useDatastoreContext } from "../DatabaseContextProvider";

const ConfigurationTab: React.FC = () => {
  const { datastore } = useDatastoreContext();
  const { clusters } = useClusterList();

  const connectedClusters = useMemo(() => {
    return clusters.filter((cluster) => {
      return datastore.connected_cluster_ids.includes(cluster.id);
    });
  }, [clusters, datastore.connected_cluster_ids]);
  return (
    <div>
      <Text size={16}>Connected clusters</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Porter automatically manages connectivity between connected clusters and
        this datastore.
      </Text>
      <Spacer y={0.5} />
      <ClusterList clusters={connectedClusters} />
    </div>
  );
};

export default ConfigurationTab;
