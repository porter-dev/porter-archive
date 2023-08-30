import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import React, { useMemo } from "react";
import EnvVariables from "../../validate-apply/app-settings/EnvVariables";
import Button from "components/porter/Button";
import Error from "components/porter/Error";
import { useFormContext } from "react-hook-form";
import { PorterAppFormData } from "lib/porter-apps";

const Environment: React.FC = () => {
  const {
    formState: { isSubmitting, errors },
  } = useFormContext<PorterAppFormData>();

  const buttonStatus = useMemo(() => {
    if (isSubmitting) {
      return "loading";
    }

    if (Object.keys(errors).length > 0) {
      return <Error message="Unable to update app" />;
    }

    return "";
  }, [isSubmitting, errors]);

  return (
    <>
      <Text size={16}>Environment variables</Text>
      <Spacer y={0.5} />
      <Text color="helper">Shared among all services.</Text>
      <EnvVariables />
      <Spacer y={0.5} />
      <Button type="submit" status={buttonStatus} loadingText={"Updating..."}>
        Update app
      </Button>
    </>
  );
};

export default Environment;
