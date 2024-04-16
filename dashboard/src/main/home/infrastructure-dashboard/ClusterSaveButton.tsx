import React from "react";

import Button from "components/porter/Button";

import { useClusterFormContext } from "./ClusterFormContextProvider";

type Props = {
  forceDisable?: boolean;
  height?: string;
  disabledTooltipPosition?: "top" | "bottom" | "left" | "right";
  isClusterUpdating?: boolean;
  children: React.ReactNode;
};
const ClusterSaveButton: React.FC<Props> = ({
  forceDisable,
  height,
  disabledTooltipPosition,
  isClusterUpdating,
  children,
}) => {
  const { updateClusterButtonProps } = useClusterFormContext();

  return (
    <Button
      type="submit"
      status={updateClusterButtonProps.status}
      loadingText={updateClusterButtonProps.loadingText}
      disabled={
        updateClusterButtonProps.isDisabled || isClusterUpdating || forceDisable
      }
      disabledTooltipMessage={
        "Please wait for the current update to complete before updating again."
      }
      height={height}
      disabledTooltipPosition={disabledTooltipPosition}
    >
      {children}
    </Button>
  );
};

export default ClusterSaveButton;
