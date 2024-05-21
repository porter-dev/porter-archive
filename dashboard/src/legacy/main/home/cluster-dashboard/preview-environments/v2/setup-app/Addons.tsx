import React from "react";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { type PorterAppFormData } from "legacy/lib/porter-apps";
import _ from "lodash";
import { useFormContext } from "react-hook-form";

import { type ButtonStatus } from "main/home/app-dashboard/app-view/AppDataContainer";
import { AddonsList } from "main/home/managed-addons/AddonsList";

import PreviewSaveButton from "./PreviewSaveButton";

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
      <Text color="helper">
        Include any add-ons you would like to be created with your preview
        environment. These are also ephemeral and will only be accessible for
        the lifetime of the preview environment.
      </Text>
      <Spacer y={0.5} />
      <AddonsList />
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
