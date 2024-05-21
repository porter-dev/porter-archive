import React from "react";
import Button from "legacy/components/porter/Button";

import { type ButtonStatus } from "main/home/app-dashboard/app-view/AppDataContainer";

type Props = {
  status: ButtonStatus;
  isDisabled: boolean;
  disabledTooltipMessage: string;
  height?: string;
  disabledTooltipPosition?: "top" | "bottom" | "left" | "right";
};
const PreviewSaveButton: React.FC<Props> = ({
  status,
  isDisabled,
  disabledTooltipMessage,
  height,
  disabledTooltipPosition,
}) => {
  return (
    <Button
      type="submit"
      status={status}
      loadingText={"Saving..."}
      disabled={isDisabled}
      disabledTooltipMessage={disabledTooltipMessage}
      height={height}
      disabledTooltipPosition={disabledTooltipPosition}
    >
      Save
    </Button>
  );
};

export default PreviewSaveButton;
