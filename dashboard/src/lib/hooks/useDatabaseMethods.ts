import { useCallback, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { match } from "ts-pattern";

import { type DbFormData } from "lib/databases/types";

import api from "shared/api";
import { Context } from "shared/Context";

type DatabaseHook = {
  create: (values: DbFormData) => Promise<void>;
  deleteDatastore: (name: string) => Promise<void>;
  attachDatastoreToAppInstances: ({
    name,
    appInstanceIds,
    clusterId,
  }: {
    name: string;
    appInstanceIds: string[];
    clusterId: number;
  }) => Promise<void>;
};
type CreateDatastoreInput = {
  name: string;
  type: "RDS" | "ELASTICACHE";
  engine: "POSTGRES" | "AURORA-POSTGRES" | "REDIS";
  values: object;
};
const clientDbToCreateInput = (values: DbFormData): CreateDatastoreInput => {
  return match(values)
    .with(
      { config: { type: "rds-postgres" } },
      (values): CreateDatastoreInput => ({
        name: values.name,
        values: {
          config: {
            name: values.name,
            databaseName: values.config.databaseName,
            masterUsername: values.config.masterUsername,
            masterUserPassword: values.config.masterUserPassword,
            allocatedStorage: values.config.allocatedStorageGigabytes,
            instanceClass: values.config.instanceClass,
          },
        },
        type: "RDS",
        engine: "POSTGRES",
      })
    )
    .with(
      { config: { type: "rds-postgresql-aurora" } },
      (values): CreateDatastoreInput => ({
        name: values.name,
        values: {
          config: {
            name: values.name,
            databaseName: values.config.databaseName,
            masterUsername: values.config.masterUsername,
            masterUserPassword: values.config.masterUserPassword,
            allocatedStorage: values.config.allocatedStorageGigabytes,
            instanceClass: values.config.instanceClass,
          },
        },
        type: "RDS",
        engine: "AURORA-POSTGRES",
      })
    )
    .with(
      { config: { type: "elasticache-redis" } },
      (values): CreateDatastoreInput => ({
        name: values.name,
        values: {
          config: {
            name: values.name,
            databaseName: values.config.databaseName,
            masterUsername: values.config.masterUsername,
            masterUserPassword: values.config.masterUserPassword,
            instanceClass: values.config.instanceClass,
          },
        },
        type: "ELASTICACHE",
        engine: "REDIS",
      })
    )
    .exhaustive();
};

export const useDatabaseMethods = (): DatabaseHook => {
  const { currentProject, currentCluster } = useContext(Context);

  const queryClient = useQueryClient();

  const create = useCallback(
    async (data: DbFormData): Promise<void> => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }
      const createDatastoreInput = clientDbToCreateInput(data);

      await api.updateDatastore(
        "<token>",
        {
          name: createDatastoreInput.name,
          type: createDatastoreInput.type,
          engine: createDatastoreInput.engine,
          values: createDatastoreInput.values,
        },
        {
          project_id: currentProject.id,
          cluster_id: data.clusterId,
        }
      );

      await queryClient.invalidateQueries({ queryKey: ["listDatastores"] });
    },
    [currentProject]
  );

  const deleteDatastore = useCallback(
    async (name: string): Promise<void> => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }

      await api.deleteDatastore(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          datastore_name: name,
        }
      );

      await queryClient.invalidateQueries({ queryKey: ["listDatastores"] });
    },
    [currentProject]
  );

  const attachDatastoreToAppInstances = useCallback(
    async ({
      name,
      appInstanceIds,
    }: {
      name: string;
      appInstanceIds: string[];
    }): Promise<void> => {
      if (
        !currentProject?.id ||
        currentProject.id === -1 ||
        !currentCluster?.id ||
        currentCluster.id === -1
      ) {
        return;
      }

      await api.attachEnvGroup(
        "<token>",
        {
          app_instance_ids: appInstanceIds,
          env_group_name: name,
        },
        {
          project_id: currentProject.id,
          // NB: this endpoint does not actually use the cluster id, because the app instance id is used
          // to deploy in its correct deployment target.
          cluster_id: currentCluster.id,
        }
      );

      await queryClient.invalidateQueries({ queryKey: ["getDatastore"] });
    },
    [currentProject, currentCluster]
  );

  return { create, deleteDatastore, attachDatastoreToAppInstances };
};
