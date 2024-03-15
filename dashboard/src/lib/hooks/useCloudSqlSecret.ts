import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import api from "shared/api";

export function useCloudSqlSecret({
  appName,
  deploymentTargetId,
  projectId,
}: {
  appName: string;
  deploymentTargetId: string;
  projectId: number;
}): boolean {
  const { data } = useQuery(
    [
      "getCloudSqlSecret",
      projectId,
      appName,
      deploymentTargetId,
    ],
    async () => {
      const res = await api.getCloudSqlSecret(
        "<token>",
        {},
        {
          project_id: projectId,
          deployment_target_id: deploymentTargetId,
          app_name: appName,
        }
      );

      const secret = await z
        .object({
          secret_name: z.string(),
        })
        .parseAsync(res.data);
      return secret;
    },
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
    }
  );

  return data !== undefined && data.secret_name !== "";
}
