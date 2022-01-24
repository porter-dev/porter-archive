import React, { useContext } from "react";
import { Context } from "shared/Context";

const ConnectToDatabaseInstructionsModal = () => {
  const { currentModalData } = useContext(Context);

  return <div>{currentModalData?.endpoint || ""}</div>;
};

export default ConnectToDatabaseInstructionsModal;
