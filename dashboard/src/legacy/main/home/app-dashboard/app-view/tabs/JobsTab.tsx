import React from "react";

import JobsSection from "../../validate-apply/jobs/JobsSection";
import { useLatestRevision } from "../LatestRevisionContext";

const JobsTab: React.FC = () => {
  const { projectId, clusterId, latestProto, deploymentTarget } =
    useLatestRevision();

  const appName = latestProto.name;

  return (
    <>
      <JobsSection
        projectId={projectId}
        clusterId={clusterId}
        deploymentTargetId={deploymentTarget.id}
        appName={appName}
        jobNames={latestProto.serviceList
          .filter((svc) => svc.config.case === "jobConfig")
          .map((svc) => svc.name)}
      />
    </>
  );
};

export default JobsTab;
