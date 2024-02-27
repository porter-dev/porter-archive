import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { SUPPORTED_DATASTORE_TEMPLATES } from "main/home/database-dashboard/constants";
import {
  datastoreListResponseValidator,
  type ClientDatastore,
} from "lib/databases/types";

import api from "shared/api";
import { Context } from "shared/Context";
import { valueExists } from "shared/util";

type DatastoreListType = {
  datastores: ClientDatastore[];
  isLoading: boolean;
};
export const useDatastoreList = (
  opts: { refetchIntervalMilliseconds: number } = {
    refetchIntervalMilliseconds: 5000,
  }
): DatastoreListType => {
  const { currentProject } = useContext(Context);

  const { data: datastores = [], isLoading: isLoadingDatastores } = useQuery(
    ["listDatastores"],
    async () => {
      if (
        !currentProject?.id ||
        currentProject.id === -1 ||
        !currentProject.db_enabled
      ) {
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
      return parsed.datastores
        .map((d) => {
          const template = SUPPORTED_DATASTORE_TEMPLATES.find(
            (t) => t.type.name === d.type && t.engine.name === d.engine
          );

          // filter out this datastore if it is a type we do not recognize
          return template ? { ...d, template } : null;
        })
        .filter(valueExists);
    },
    {
      enabled:
        !!currentProject?.id &&
        currentProject.id !== -1 &&
        currentProject.db_enabled,
      refetchOnWindowFocus: false,
      refetchInterval: opts.refetchIntervalMilliseconds,
    }
  );

  return {
    datastores,
    isLoading: isLoadingDatastores,
  };
};
