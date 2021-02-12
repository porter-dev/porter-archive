import { Location } from "history";

export const PorterUrls = [
  "dashboard",
  "templates",
  "integrations",
  "new-project",
  "cluster-dashboard",
  "project-settings",
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
    search: urlParams.toString(),
  };
};

export type PorterUrls = typeof PorterUrls[number];
