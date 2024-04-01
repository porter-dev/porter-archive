import React from "react";
import { useFormContext } from "react-hook-form";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { useAppStatus } from "lib/hooks/useAppStatus";
import { useCluster } from "lib/hooks/useCluster";
import { type PorterAppFormData } from "lib/porter-apps";
import {
  isClientWebService,
  isClientWorkerService,
} from "lib/porter-apps/services";

import ServiceList from "../../validate-apply/services-settings/ServiceList";
import { type ButtonStatus } from "../AppDataContainer";
import AppSaveButton from "../AppSaveButton";
import { useLatestRevision } from "../LatestRevisionContext";

type Props = {
  buttonStatus: ButtonStatus;
};

const Overview: React.FC<Props> = ({ buttonStatus }) => {
  const { formState } = useFormContext<PorterAppFormData>();

  const {
    porterApp,
    latestProto,
    projectId,
    clusterId,
    deploymentTarget,
    latestClientServices,
  } = useLatestRevision();

  const { cluster } = useCluster({
    clusterId,
  });

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
      <Text size={16}>Pre-deploy job</Text>
      <Spacer y={0.5} />
      <ServiceList
        addNewText={"Add a new pre-deploy job"}
        existingServiceNames={latestProto.predeploy ? ["pre-deploy"] : []}
        isPredeploy
        fieldArrayName={"app.predeploy"}
      />
      <Spacer y={0.5} />
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
        cluster={cluster}
      />
      <Spacer y={0.75} />
      <AppSaveButton
        status={buttonStatus}
        isDisabled={formState.isSubmitting}
        disabledTooltipMessage="Please wait for the deploy to complete before updating services"
      />
    </>
  );
};

export default Overview;
