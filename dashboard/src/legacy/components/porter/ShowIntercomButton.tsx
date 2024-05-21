import React from "react";
import chat from "legacy/assets/chat.svg";
import { useIntercom } from "legacy/lib/hooks/useIntercom";

import Button, { type ButtonProps } from "./Button";

type Props = Omit<ButtonProps, "children"> & {
  message: string;
  children?: React.ReactNode;
};

const ShowIntercomButton: React.FC<Props> = (props) => {
  const { showIntercomWithMessage } = useIntercom();
  const { message, children } = props;
  return (
    <Button
      onClick={() => {
        showIntercomWithMessage({
          message,
          delaySeconds: 0,
        });
      }}
      {...props}
    >
      <img src={chat} style={{ width: "15px", marginRight: "10px" }} />
      {children || "Talk to support"}
    </Button>
  );
};

export default ShowIntercomButton;
