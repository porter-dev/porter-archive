import React from "react";
import { useLatestRevision } from "../LatestRevisionContext";
import JobsSection from "../../validate-apply/jobs/JobsSection";

const JobsTab: React.FC = () => {
    const { projectId, clusterId, latestProto, deploymentTargetId } = useLatestRevision();

    const appName = latestProto.name

    return (
        <>
            <JobsSection
                projectId={projectId}
                clusterId={clusterId}
                deploymentTargetId={deploymentTargetId}
                appName={appName}
                jobNames={Object.keys(latestProto.services).filter(name => latestProto.services[name].config.case === "jobConfig")}
            />
        </>
    );
};

export default JobsTab;
