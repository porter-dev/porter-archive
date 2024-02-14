import React from "react";

import Button from "components/porter/Button";

import { type ButtonStatus } from "./ClusterTabs";

type Props = {
  status: ButtonStatus;
  isDisabled: boolean;
  height?: string;
  disabledTooltipPosition?: "top" | "bottom" | "left" | "right";
  loadingText?: string;
};
const ClusterSaveButton: React.FC<Props> = ({
  status,
  isDisabled,
  height,
  disabledTooltipPosition,
  loadingText,
}) => {
  return (
    <Button
      type="submit"
      status={status}
      loadingText={loadingText}
      disabled={isDisabled}
      disabledTooltipMessage={
        "Please wait for the current update to complete before updating again."
      }
      height={height}
      disabledTooltipPosition={disabledTooltipPosition}
    >
      Update
    </Button>
  );
};

export default ClusterSaveButton;
