import React from "react";
import { StatusStyles } from "./styles";
import loading from "assets/loading.gif";

export type StatusProps = {
  status: "loading" | "failed" | "successful" | "unknown";
  message: string;
  className?: string;
};

const Status = ({ status, message, className }: StatusProps) => {
  return (
    <>
      <StatusStyles.Status className={className}>
        {status === "loading" && <StatusStyles.Spinner src={loading} />}
        {status === "failed" && <StatusStyles.Failed />}
        {status === "successful" && <StatusStyles.Successful />}
        {status === "unknown" && <StatusStyles.Unknown />}
        {message}
      </StatusStyles.Status>
    </>
  );
};

export default Status;
