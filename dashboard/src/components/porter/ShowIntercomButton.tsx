import React from "react";

import { useIntercom } from "lib/hooks/useIntercom";

import chat from "assets/chat.svg";

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
