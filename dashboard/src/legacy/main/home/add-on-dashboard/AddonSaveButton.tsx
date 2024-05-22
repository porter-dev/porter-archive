import React from "react";
import Button from "legacy/components/porter/Button";

import { useAddonFormContext } from "./AddonFormContextProvider";

type Props = {
  height?: string;
  disabledTooltipPosition?: "top" | "bottom" | "left" | "right";
};
const AddonSaveButton: React.FC<Props> = ({
  height,
  disabledTooltipPosition,
}) => {
  const { updateAddonButtonProps } = useAddonFormContext();

  return (
    <Button
      type="submit"
      status={updateAddonButtonProps.status}
      loadingText={updateAddonButtonProps.loadingText}
      disabled={updateAddonButtonProps.isDisabled}
      disabledTooltipMessage={
        "Please wait for the current update to complete before updating again."
      }
      height={height}
      disabledTooltipPosition={disabledTooltipPosition}
    >
      Deploy
    </Button>
  );
};

export default AddonSaveButton;
