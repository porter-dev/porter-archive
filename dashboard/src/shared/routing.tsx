import { Location } from "history";

export type PorterUrl =
  | "dashboard"
  | "launch"
  | "integrations"
  | "new-project"
  | "cluster-dashboard"
  | "project-settings"
  | "applications"
  | "env-groups"
  | "jobs";

export const PorterUrls = [
  "dashboard",
  "launch",
  "integrations",
  "new-project",
  "cluster-dashboard",
  "project-settings",
  "applications",
  "env-groups",
  "jobs",
];

export const pushQueryParams = (props: any, params: any) => {
  let { location, history } = props;
  const urlParams = new URLSearchParams(location.search);
  Object.keys(params)?.forEach((key: string) => {
    urlParams.set(key, params[key]);
  });
  history.push({
    pathname: location.pathname,
    search: urlParams.toString(),
  });
};

export const pushFiltered = (
  props: any, // Props for retrieving history and location
  pathname: string, // Path to redirect to
  keys: string[] // Query params to preserve during redirect
) => {
  let { location, history } = props;
  let urlParams = new URLSearchParams(location.search);
  let newUrlParams = new URLSearchParams("");
  keys?.forEach((key: string) => {
    let value = urlParams.get(key);
    value && newUrlParams.set(key, value);
  });
  history.push({
    pathname,
    search: newUrlParams.toString(),
  });
};
