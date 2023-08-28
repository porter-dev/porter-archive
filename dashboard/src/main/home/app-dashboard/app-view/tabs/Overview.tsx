import { PorterApp } from "@porter-dev/api-contracts";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { PorterAppFormData } from "lib/porter-apps";
import React, { useMemo } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import ServiceList from "../../validate-apply/services-settings/ServiceList";
import {
  defaultSerialized,
  deserializeService,
} from "lib/porter-apps/services";
import Error from "components/porter/Error";
import Button from "components/porter/Button";

const Overview: React.FC = () => {
  const { formState } = useFormContext<PorterAppFormData>();

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
      <Text size={16}>Pre-deploy job</Text>
      <Spacer y={0.5} />
      <ServiceList
        limitOne={true}
        addNewText={"Add a new pre-deploy job"}
        prePopulateService={deserializeService({
          service: defaultSerialized({
            name: "pre-deploy",
            type: "predeploy",
          }),
        })}
        isPredeploy
      />
      <Spacer y={0.5} />
      <Text size={16}>Application services</Text>
      <Spacer y={0.5} />
      <ServiceList addNewText={"Add a new service"} />
      <Spacer y={0.75} />
      <Button
        type="submit"
        status={buttonStatus}
        loadingText={"Updating..."}
        disabled={formState.isSubmitting || !formState.isDirty}
      >
        Update app
      </Button>
    </>
  );
};

export default Overview;
