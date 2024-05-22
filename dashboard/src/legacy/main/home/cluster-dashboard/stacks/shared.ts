import { StatusProps } from "./components/Status";
import { Stack } from "./types";

export const getStackStatus = (stack: Stack): StatusProps["status"] => {
  const latestRevision = stack.latest_revision;

  if (latestRevision === null) {
    return "unknown";
  }

  if (latestRevision.status === "deployed") {
    return "successful";
  }

  if (latestRevision.status === "deploying") {
    return "loading";
  }

  if (latestRevision.status === "failed") {
    return "failed";
  }

  return "unknown";
};

export const getStackStatusMessage = (stack: Stack): StatusProps["message"] => {
  const latestRevision = stack.latest_revision;

  if (latestRevision === null) {
    return "";
  }

  if (latestRevision.status === "failed") {
    return latestRevision.reason.split(/(?=[A-Z])/).join(" ");
  }

  switch (latestRevision.status) {
    case "deploying":
      return "Deploying";
    case "deployed":
      return "Deployed";
    case "deploying":
      return "Deploying";
    default:
      return "";
  }
};
