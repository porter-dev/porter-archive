import React from "react";

import MetricsSection from "../../validate-apply/metrics/MetricsSection";
import { useLatestRevision } from "../LatestRevisionContext";

const MetricsTab: React.FC = () => {
  const {
    projectId,
    clusterId,
    appName,
    latestClientServices,
    deploymentTarget,
  } = useLatestRevision();

  return (
    <MetricsSection
      projectId={projectId}
      clusterId={clusterId}
      appName={appName}
      // we do not yet support metrics for jobs
      services={latestClientServices.filter(
        (svc) => svc.config.type !== "predeploy" && svc.config.type !== "job"
      )}
      deploymentTargetId={deploymentTarget.id}
    />
  );
};

export default MetricsTab;
