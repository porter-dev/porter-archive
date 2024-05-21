import React, { useMemo } from "react";

import StatusBar from "components/porter/StatusBar";

import { useClusterContext } from "./ClusterContextProvider";

const ClusterProvisioningIndicator: React.FC = () => {
  const { cluster } = useClusterContext();

  const { percentCompleted, title } = useMemo(() => {
    let stepsCompleted = 1;
    if (cluster.state?.is_control_plane_ready) {
      stepsCompleted += 1;
    }
    if (cluster.state?.is_infrastructure_ready) {
      stepsCompleted += 1;
    }
    if (cluster.state?.phase === "Provisioned") {
      stepsCompleted += 1;
    }
    const percentCompleted = (stepsCompleted / 5) * 100.0;
    const title = `${cluster.cloud_provider.name} provisioning status`;
    return { percentCompleted, title };
  }, [cluster]);

  return (
    <StatusBar
      icon={cluster.cloud_provider.icon}
      title={title}
      subtitle={`Setup can take up to 20 minutes. You can close this window and come back later.`}
      percentCompleted={percentCompleted}
    />
  );
};

export default ClusterProvisioningIndicator;
