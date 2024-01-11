import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  datastoreListResponseValidator,
  type ClientDatastore,
} from "lib/databases/types";

import api from "shared/api";
import { Context } from "shared/Context";

type DatabaseListType = {
  datastores: ClientDatastore[];
  isLoading: boolean;
};
export const useDatabaseList = (): DatabaseListType => {
  const { currentProject } = useContext(Context);

  const { data: datastores, isLoading: isLoadingDatastores } = useQuery(
    ["listDatastores"],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }

      const response = await api.listDatastores(
        "<token>",
        {},
        {
          project_id: currentProject.id,
        }
      );

      const parsed = await datastoreListResponseValidator.parseAsync(
        response.data
      );
      return parsed.datastores;
    },
    {
      enabled: !!currentProject?.id && currentProject.id !== -1,
      refetchInterval: 10000,
      refetchOnWindowFocus: false,
    }
  );

  return {
    datastores: datastores ?? [],
    isLoading: isLoadingDatastores,
  };
};
