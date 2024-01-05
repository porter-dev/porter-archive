import React from "react";
import { useFormContext } from "react-hook-form";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useAppStatus } from "lib/hooks/useAppStatus";
import { type PorterAppFormData } from "lib/porter-apps";
import {
  defaultSerialized,
  deserializeService,
  isClientWebService,
  isClientWorkerService,
} from "lib/porter-apps/services";

import { useClusterResources } from "shared/ClusterResourcesContext";

import ServiceList from "../../validate-apply/services-settings/ServiceList";
import { type ButtonStatus } from "../AppDataContainer";
import AppSaveButton from "../AppSaveButton";
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
    latestClientServices,
  } = useLatestRevision();

  const { serviceVersionStatus } = useAppStatus({
    projectId,
    clusterId,
    services: latestClientServices.filter(
      (s) => isClientWebService(s) || isClientWorkerService(s) // we only care about the pod status of web and workers
    ),
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
      <AppSaveButton
        status={buttonStatus}
        isDisabled={
          formState.isSubmitting || latestRevision.status === "CREATED"
        }
        disabledTooltipMessage="Please wait for the deploy to complete before updating services"
      />
    </>
  );
};

export default Overview;
