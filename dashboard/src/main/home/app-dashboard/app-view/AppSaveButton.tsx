import React from "react";

import Button from "components/porter/Button";

import { type ButtonStatus } from "./AppDataContainer";

type Props = {
  status: ButtonStatus;
  isDisabled: boolean;
  disabledTooltipMessage: string;
  height?: string;
  disabledTooltipPosition?: "top" | "bottom" | "left" | "right";
};
const AppSaveButton: React.FC<Props> = ({
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
      loadingText={"Deploying..."}
      disabled={isDisabled}
      disabledTooltipMessage={disabledTooltipMessage}
      height={height}
      disabledTooltipPosition={disabledTooltipPosition}
    >
      Deploy
    </Button>
  );
};

export default AppSaveButton;
