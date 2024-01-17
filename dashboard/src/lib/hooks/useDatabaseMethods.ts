import { useCallback, useContext } from "react";
import { match } from "ts-pattern";

import { type DbFormData } from "lib/databases/types";

import api from "shared/api";
import { Context } from "shared/Context";

type DatabaseHook = {
  create: (values: DbFormData) => Promise<void>;
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
  const { capabilities, currentProject, currentCluster } = useContext(Context);

  const create = useCallback(
    async (data: DbFormData): Promise<void> => {
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
          project_id: currentProject?.id || -1,
          cluster_id: currentCluster?.id || -1,
        }
      );
    },
    [currentProject, currentCluster, capabilities]
  );

  return { create };
};
