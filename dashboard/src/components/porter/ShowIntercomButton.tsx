import React from "react";

import { useIntercom } from "lib/hooks/useIntercom";

import chat from "assets/chat.svg";

import Button from "./Button";

type Props = {
  message: string;
};
const ShowIntercomButton: React.FC<Props> = ({ message }) => {
  const { showIntercomWithMessage } = useIntercom();

  return (
    <Button
      onClick={() => {
        showIntercomWithMessage({
          message,
          delaySeconds: 0,
        });
      }}
    >
      <img src={chat} style={{ width: "15px", marginRight: "10px" }} />
      Talk to support
    </Button>
  );
};

export default ShowIntercomButton;
