import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  envGroupListResponseValidator,
  type EnvGroup,
} from "lib/env-groups/types";

import api from "shared/api";
import { Context } from "shared/Context";
import { valueExists } from "shared/util";

type EnvGroupListParams = {
  refetch?: boolean;
};

type EnvGroupListType = {
  envGroups: EnvGroup[];
  isLoading: boolean;
};
export const useEnvGroupList = ({ refetch }: EnvGroupListParams = { refetch: true }): EnvGroupListType => {
  const { currentProject, currentCluster } = useContext(Context);

  const { data: envGroups, isLoading } = useQuery(
    ["getAllEnvGroups"],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }
      if (!currentCluster?.id || currentCluster.id === -1) {
        return;
      }

      const response = await api.getAllEnvGroups(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );

      const parsed = await envGroupListResponseValidator.parseAsync(
        response.data
      );
      return parsed.envGroups.filter(valueExists);
    },
    {
      enabled: refetch && !!currentProject?.id && currentProject.id !== -1,
      refetchOnWindowFocus: false,
    }
  );

  return {
    envGroups: envGroups ?? [],
    isLoading,
  };
};
