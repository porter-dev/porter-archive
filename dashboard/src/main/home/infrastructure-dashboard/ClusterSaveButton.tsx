import React from "react";

import Button from "components/porter/Button";

import { useClusterContext } from "./ClusterContextProvider";
import { useClusterFormContext } from "./ClusterFormContextProvider";

type Props = {
  height?: string;
  disabledTooltipPosition?: "top" | "bottom" | "left" | "right";
};
const ClusterSaveButton: React.FC<Props> = ({
  height,
  disabledTooltipPosition,
}) => {
  const { updateClusterButtonProps } = useClusterFormContext();
  const { isClusterUpdating } = useClusterContext();

  return (
    <Button
      type="submit"
      status={updateClusterButtonProps.status}
      loadingText={updateClusterButtonProps.loadingText}
      disabled={updateClusterButtonProps.isDisabled || isClusterUpdating}
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
