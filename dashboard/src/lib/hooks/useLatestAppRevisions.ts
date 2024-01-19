import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import {
  appRevisionWithSourceValidator,
  type AppRevisionWithSource,
} from "main/home/app-dashboard/apps/types";

import api from "shared/api";

// use this hook to get the latest revision of every app in the project/cluster
export const useLatestAppRevisions = ({
  projectId,
  clusterId,
}: {
  projectId: number;
  clusterId: number;
}): {
  revisions: AppRevisionWithSource[];
} => {
  const { data: apps = [] } = useQuery(
    [
      "getLatestAppRevisions",
      {
        cluster_id: clusterId,
        project_id: projectId,
      },
    ],
    async () => {
      if (clusterId === -1 || projectId === -1) {
        return;
      }

      const res = await api.getLatestAppRevisions(
        "<token>",
        {
          deployment_target_id: undefined,
          ignore_preview_apps: true,
        },
        { cluster_id: clusterId, project_id: projectId }
      );

      const apps = await z
        .object({
          app_revisions: z.array(appRevisionWithSourceValidator),
        })
        .parseAsync(res.data);

      return apps.app_revisions;
    },
    {
      refetchOnWindowFocus: false,
      enabled: clusterId !== 0 && projectId !== 0,
    }
  );
  return {
    revisions: apps ?? [],
  };
};
