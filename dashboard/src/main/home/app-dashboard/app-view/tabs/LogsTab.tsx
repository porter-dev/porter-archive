import { PorterApp } from "@porter-dev/api-contracts";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { PorterAppFormData } from "lib/porter-apps";
import React, { useMemo } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import Logs from "../../validate-apply/logs/Logs"
import {
    defaultSerialized,
    deserializeService,
} from "lib/porter-apps/services";
import Error from "components/porter/Error";
import Button from "components/porter/Button";
import { useLatestRevision } from "../LatestRevisionContext";

const LogsTab: React.FC = () => {
    const { projectId, clusterId, latestProto , deploymentTargetId} = useLatestRevision();

    const appName = latestProto.name
    const serviceNames = Object.keys(latestProto.services)

    return (
        <>
            <Logs
                projectId={projectId}
                clusterId={clusterId}
                appName={appName}
                serviceNames={serviceNames}
                deploymentTargetId={deploymentTargetId}
            />
        </>
    );
};

export default LogsTab;
