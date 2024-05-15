import React from "react";
import { useFormContext } from "react-hook-form";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import ServiceList from "main/home/app-dashboard/validate-apply/services-settings/ServiceList";

import { useDeploymentTarget } from "shared/DeploymentTargetContext";

import { type AppTemplateFormData } from "../EnvTemplateContextProvider";

export const ConsolidatedServices: React.FC = () => {
  const { watch } = useFormContext<AppTemplateFormData>();
  const { currentDeploymentTarget } = useDeploymentTarget();

  const initialDeploy = watch("app.initialDeploy");
  const predeploy = watch("app.predeploy");
  const name = watch("app.name");

  return (
    <>
      <Text size={16}>Initial deploy job</Text>
      <Spacer y={0.5} />
      <ServiceList
        addNewText={"Add a new initial deploy job"}
        existingServiceNames={initialDeploy ? ["initdeploy"] : []}
        lifecycleJobType="initdeploy"
        fieldArrayName={"app.initialDeploy"}
      />
      <Spacer y={0.5} />
      <Text size={16}>Pre-deploy job</Text>
      <Spacer y={0.5} />
      <ServiceList
        addNewText={"Add a new pre-deploy job"}
        existingServiceNames={predeploy ? ["pre-deploy"] : []}
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
          namespace: currentDeploymentTarget?.namespace || "default",
          appName: name.value,
        }}
        allowAddServices={false}
      />
      <Spacer y={0.75} />
    </>
  );
};
