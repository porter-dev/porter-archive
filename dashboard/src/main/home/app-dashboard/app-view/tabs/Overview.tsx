import React from "react";
import { useFormContext } from "react-hook-form";

import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useAppStatus } from "lib/hooks/useAppStatus";
import { type PorterAppFormData } from "lib/porter-apps";
import {
  defaultSerialized,
  deserializeService,
} from "lib/porter-apps/services";

import { useClusterResources } from "shared/ClusterResourcesContext";

import ServiceList from "../../validate-apply/services-settings/ServiceList";
import { type ButtonStatus } from "../AppDataContainer";
import { useLatestRevision } from "../LatestRevisionContext";

type Props = {
  buttonStatus: ButtonStatus;
};

const Overview: React.FC<Props> = ({ buttonStatus }) => {
  const { formState } = useFormContext<PorterAppFormData>();

  const { currentClusterResources } = useClusterResources();

  const {
    porterApp,
    latestProto,
    latestRevision,
    projectId,
    clusterId,
    deploymentTarget,
  } = useLatestRevision();

  const { serviceVersionStatus } = useAppStatus({
    projectId,
    clusterId,
    serviceNames: latestProto.serviceList.map((s) => s.name),
    deploymentTargetId: deploymentTarget.id,
    appName: latestProto.name,
  });

  return (
    <>
      {porterApp.git_repo_id && (
        <>
          <Text size={16}>Pre-deploy job</Text>
          <Spacer y={0.5} />
          <ServiceList
            addNewText={"Add a new pre-deploy job"}
            prePopulateService={deserializeService({
              service: defaultSerialized({
                name: "pre-deploy",
                type: "predeploy",
                defaultCPU: currentClusterResources.defaultCPU,
                defaultRAM: currentClusterResources.defaultRAM,
              }),
            })}
            existingServiceNames={latestProto.predeploy ? ["pre-deploy"] : []}
            isPredeploy
            fieldArrayName={"app.predeploy"}
          />
          <Spacer y={0.5} />
        </>
      )}
      <Text size={16}>Application services</Text>
      <Spacer y={0.5} />
      <ServiceList
        addNewText={"Add a new service"}
        fieldArrayName={"app.services"}
        existingServiceNames={latestProto.serviceList.map((s) => s.name)}
        serviceVersionStatus={serviceVersionStatus}
        internalNetworkingDetails={{
          namespace: deploymentTarget.namespace,
          appName: porterApp.name,
        }}
      />
      <Spacer y={0.75} />
      <Button
        type="submit"
        status={buttonStatus}
        loadingText={"Updating..."}
        disabled={formState.isSubmitting || latestRevision.status === "CREATED"}
        disabledTooltipMessage="Please wait for the deploy to complete before updating services"
      >
        Update app
      </Button>
    </>
  );
};

export default Overview;
