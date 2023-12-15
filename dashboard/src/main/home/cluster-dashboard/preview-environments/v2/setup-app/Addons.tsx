import React from "react";
import _ from "lodash";
import { useFormContext } from "react-hook-form";

import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { type ButtonStatus } from "main/home/app-dashboard/app-view/AppDataContainer";
import { AddonsList } from "main/home/managed-addons/AddonsList";
import { type PorterAppFormData } from "lib/porter-apps";

type Props = {
  buttonStatus: ButtonStatus;
};

export const Addons: React.FC<Props> = ({ buttonStatus }) => {
  const {
    formState: { isSubmitting },
  } = useFormContext<PorterAppFormData>();

  return (
    <>
      <Text size={16}>Add-ons</Text>
      <Spacer y={0.5} />
      <AddonsList />
      <Spacer y={0.75} />
      <Button
        type="submit"
        status={buttonStatus}
        loadingText={"Updating..."}
        disabled={isSubmitting}
      >
        Update app
      </Button>
    </>
  );
};
