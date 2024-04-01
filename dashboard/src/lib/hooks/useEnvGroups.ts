import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { envGroupValidator, type ClientEnvGroup } from "lib/env-groups/types";

import api from "shared/api";
import { Context } from "shared/Context";

type TUseEnvGroupList = {
  envGroups: ClientEnvGroup[];
  isLoading: boolean;
};
export const useEnvGroupList = ({
  clusterId,
}: {
  clusterId?: number;
}): TUseEnvGroupList => {
  const { currentProject } = useContext(Context);

  const envGroupReq = useQuery(
    ["getEnvGroups", currentProject?.id],
    async () => {
      if (!currentProject?.id || currentProject.id === -1 || !clusterId) {
        return;
      }

      const res = await api.getAllEnvGroups(
        "<token>",
        {},
        {
          id: currentProject?.id,
          cluster_id: clusterId,
        }
      );
      const parsed = await z
        .object({ environment_groups: z.array(envGroupValidator) })
        .parseAsync(res.data);
      return parsed.environment_groups;
    },
    {
      enabled: !!currentProject && currentProject.id !== -1,
    }
  );

  return {
    envGroups: envGroupReq.data ?? [],
    isLoading: envGroupReq.isLoading,
  };
};
