import { useHistory, useLocation } from "react-router";

export type PorterUrl =
  | "dashboard"
  | "launch"
  | "integrations"
  | "new-project"
  | "cluster-dashboard"
  | "infrastructure"
  | "project-settings"
  | "applications"
  | "env-groups"
  | "jobs"
  | "onboarding"
  | "databases"
  | "preview-environments"
  | "apps"
  | "addons"
  | "compliance"
  | "environment-groups"
  | "inference"
  | "stacks";

export const PorterUrls = [
  "dashboard",
  "launch",
  "integrations",
  "new-project",
  "cluster-dashboard",
  "project-settings",
  "infrastructure",
  "applications",
  "env-groups",
  "jobs",
  "onboarding",
  "databases",
  "datastores",
  "preview-environments",
  "apps",
  "addons",
  "compliance",
  "environment-groups",
  "inference",
  "stacks",
  "ory",
];

// TODO: consolidate with pushFiltered
export const pushQueryParams = (
  props: any,
  params: any,
  removedParams?: string[]
) => {
  const { location, history } = props;
  const urlParams = new URLSearchParams(location.search);
  Object.keys(params)?.forEach((key: string) => {
    params[key] && urlParams.set(key, params[key]);
  });

  removedParams?.map((deletedParam) => {
    urlParams.delete(deletedParam);
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
  const { location, history } = props;
  const urlParams = new URLSearchParams(location.search);
  const newUrlParams = new URLSearchParams("");
  keys?.forEach((key: string) => {
    const value = urlParams.get(key);
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
  return new URLSearchParams(searchParams);
};

export const getQueryParam = (props: any, paramName: string) => {
  const searchParams = getQueryParams(props);
  return searchParams?.get(paramName);
};

export const useRouting = () => {
  const location = useLocation();
  const history = useHistory();

  return {
    push(path: string, state?: any) {
      history.push(path, state);
    },
    pushQueryParams: (
      params: Record<string, unknown>,
      removedParams?: string[]
    ) => {
      pushQueryParams({ location, history }, params, removedParams);
    },
    pushFiltered: (
      pathname: string,
      keys: string[],
      params?: Record<string, unknown>
    ) => {
      pushFiltered({ location, history }, pathname, keys, params);
    },
    getQueryParams: () => {
      return getQueryParams({ location });
    },
    getQueryParam: (paramName: string) => {
      return getQueryParam({ location }, paramName);
    },
  };
};
