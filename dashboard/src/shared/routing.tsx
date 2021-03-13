import { Location } from "history";

export type PorterUrl =
  | "dashboard"
  | "launch"
  | "integrations"
  | "new-project"
  | "cluster-dashboard"
  | "project-settings";

export const PorterUrls = [
  "dashboard",
  "launch",
  "integrations",
  "new-project",
  "cluster-dashboard",
  "project-settings"
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
