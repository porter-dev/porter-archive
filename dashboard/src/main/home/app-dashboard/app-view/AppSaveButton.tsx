import React from "react";

import Button from "components/porter/Button";
import Icon from "components/porter/Icon";
import Spacer from "components/porter/Spacer";

import save from "assets/save-01.svg";

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
      loadingText={"Saving..."}
      disabled={isDisabled}
      disabledTooltipMessage={disabledTooltipMessage}
      height={height}
      disabledTooltipPosition={disabledTooltipPosition}
    >
      <Icon src={save} height={"13px"} />
      <Spacer inline x={0.5} />
      Save
    </Button>
  );
};

export default AppSaveButton;
