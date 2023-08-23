import React from "react";
import { useMemo } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const validTabs = [
  // "activity",
  // "events",
  "overview",
  // "logs",
  // "metrics",
  // "debug",
  "environment",
  "build-settings",
  "settings",
  // "helm-values",
  // "job-history",
] as const;
const DEFAULT_TAB = "activity";
type ValidTab = typeof validTabs[number];

type Props = RouteComponentProps & {};

const AppView: React.FC<Props> = ({ match }) => {
  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        appName: z.string(),
      })
      .safeParse(params);

    if (!validParams.success) {
      return {
        appName: null,
      };
    }

    return validParams.data;
  }, [match]);

  const { data, status } = useQuery(
    ["getAppRevision", params.appName, "latest"],
    async () => {},
    {
      enabled: !!params.appName,
    }
  );

  return <div></div>;
};

export default withRouter(AppView);
