import React from "react";
import _ from "lodash";
import { useFormContext } from "react-hook-form";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ButtonStatus } from "main/home/app-dashboard/app-view/AppDataContainer";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import ServiceList from "main/home/app-dashboard/validate-apply/services-settings/ServiceList";
import { type PorterAppFormData } from "lib/porter-apps";

import PreviewSaveButton from "./PreviewSaveButton";

type Props = {
  buttonStatus: ButtonStatus;
};

export const ServiceSettings: React.FC<Props> = ({ buttonStatus }) => {
  const { deploymentTarget, porterApp, latestProto } = useLatestRevision();

  const {
    formState: { isSubmitting },
  } = useFormContext<PorterAppFormData>();

  return (
    <>
      <Text size={16}>Initial deploy job</Text>
      <Spacer y={0.5} />
      <ServiceList
        addNewText={"Add a new initial deploy job"}
        existingServiceNames={latestProto.initialDeploy ? ["initdeploy"] : []}
        lifecycleJobType="initdeploy"
        fieldArrayName={"app.initialDeploy"}
      />
      <Spacer y={0.5} />
      <Text size={16}>Pre-deploy job</Text>
      <Spacer y={0.5} />
      <ServiceList
        addNewText={"Add a new pre-deploy job"}
        existingServiceNames={latestProto.predeploy ? ["pre-deploy"] : []}
        lifecycleJobType="predeploy"
        fieldArrayName={"app.predeploy"}
      />
      <Spacer y={0.5} />
      <Text size={16}>Application services</Text>
      <Spacer y={0.5} />
      <ServiceList
        addNewText={"Add a new service"}
        fieldArrayName={"app.services"}
        internalNetworkingDetails={{
          namespace: deploymentTarget.namespace,
          appName: porterApp.name,
        }}
        allowAddServices={false}
      />
      <Spacer y={0.75} />
      <PreviewSaveButton
        status={buttonStatus}
        isDisabled={isSubmitting}
        disabledTooltipMessage={"Please fill out all required fields"}
        disabledTooltipPosition={"top"}
      />
    </>
  );
};
