import { Location } from "history";

export type PorterUrl =
  | "dashboard"
  | "launch"
  | "integrations"
  | "new-project"
  | "cluster-dashboard"
  | "project-settings"
  | "applications"
  | "jobs";

export const PorterUrls = [
  "dashboard",
  "launch",
  "integrations",
  "new-project",
  "cluster-dashboard",
  "project-settings",
  "applications",
  "jobs",
];

export const setSearchParam = (
  location: Location<any>,
  key: string,
  value: string
) => {
  const urlParams = new URLSearchParams(location.search);
  urlParams.set(key, value);
  return {
    pathname: location.pathname,
    search: urlParams.toString()
  };
};
