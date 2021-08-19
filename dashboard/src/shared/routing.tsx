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

// TODO: consolidate with pushFiltered
export const pushQueryParams = (props: any, params: any) => {
  let { location, history } = props;
  const urlParams = new URLSearchParams(location.search);
  Object.keys(params)?.forEach((key: string) => {
    params[key] && urlParams.set(key, params[key]);
  });
  history.push({
    pathname: location.pathname,
    search: urlParams.toString(),
  });
};

export const pushFiltered = (
  props: any, // Props for retrieving history and location
  pathname: string, // Path to redirect to
  keys: string[], // Query params to preserve during redirect
  params?: any
) => {
  let { location, history } = props;
  let urlParams = new URLSearchParams(location.search);
  let newUrlParams = new URLSearchParams("");
  keys?.forEach((key: string) => {
    let value = urlParams.get(key);
    value && newUrlParams.set(key, value);
  });
  params &&
    Object.keys(params)?.forEach((key: string) => {
      params[key] && newUrlParams.set(key, params[key]);
    });
  history.push({
    pathname,
    search: newUrlParams.toString(),
  });
};

export const getQueryParams = (props: any) => {
  const searchParams = props.location.search;
  if (searchParams) {
    return new URLSearchParams(searchParams);
  }
};

export const getQueryParam = (props: any, paramName: string) => {
  const searchParams = getQueryParams(props);
  return searchParams?.get(paramName);
};
