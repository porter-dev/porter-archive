import { PorterApp } from "@porter-dev/api-contracts";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { PorterAppFormData } from "lib/porter-apps";
import React, { useEffect, useMemo } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import ServiceList from "../../validate-apply/services-settings/ServiceList";
import {
  defaultSerialized,
  deserializeService,
} from "lib/porter-apps/services";
import Error from "components/porter/Error";
import Button from "components/porter/Button";
import { useLatestRevision } from "../LatestRevisionContext";
import { useAppStatus } from "lib/hooks/useAppStatus";

const Overview: React.FC = () => {
  const { formState } = useFormContext<PorterAppFormData>();
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
    serviceNames: Object.keys(latestProto.services),
    deploymentTargetId: deploymentTarget.id,
    appName: latestProto.name,
  });

  const buttonStatus = useMemo(() => {
    if (formState.isSubmitting) {
      return "loading";
    }

    if (Object.keys(formState.errors).length > 0) {
      return <Error message="Unable to update app" />;
    }

    return "";
  }, [formState.isSubmitting, formState.errors]);

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
              }),
            })}
            existingServiceNames={Object.keys(latestProto.services)}
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
        existingServiceNames={Object.keys(latestProto.services)}
        serviceVersionStatus={serviceVersionStatus}
      />
      <Spacer y={0.75} />
      <Button
        type="submit"
        status={buttonStatus}
        loadingText={"Updating..."}
        disabled={
          formState.isSubmitting ||
          latestRevision.status === "CREATED" ||
          latestRevision.status === "AWAITING_BUILD_ARTIFACT"
        }
        disabledTooltipMessage="Please wait for the build to complete before updating services"
      >
        Update app
      </Button>
    </>
  );
};

export default Overview;
