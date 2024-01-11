import { useCallback, useContext } from "react";
import { match } from "ts-pattern";

import { type DbFormData } from "lib/databases/types";

import api from "shared/api";
import { Context } from "shared/Context";

type DatabaseHook = {
  create: (values: DbFormData) => Promise<void>;
};
const clientDbToValues = (
  values: DbFormData
): { values: object; templateName: string } => {
  return match(values)
    .with({ config: { type: "rds-postgres" } }, (values) => ({
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
      templateName: "rds-postgresql",
    }))
    .with({ config: { type: "rds-postgresql-aurora" } }, (values) => ({
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
      templateName: "rds-postgresql-aurora",
    }))
    .with({ config: { type: "elasticache-redis" } }, (values) => ({
      values: {
        config: {
          name: values.name,
          databaseName: values.config.databaseName,
          masterUsername: values.config.masterUsername,
          masterUserPassword: values.config.masterUserPassword,
          instanceClass: values.config.instanceClass,
        },
      },
      templateName: "elasticache-redis",
    }))
    .exhaustive();
};

export const useDatabaseMethods = (): DatabaseHook => {
  const { capabilities, currentProject, currentCluster } = useContext(Context);

  const create = useCallback(
    async (data: DbFormData): Promise<void> => {
      const { values, templateName } = clientDbToValues(data);
      const name = data.name;

      await api.deployAddon(
        "<token>",
        {
          template_name: templateName,
          template_version: "latest",
          values,
          name,
        },
        {
          id: currentProject?.id || -1,
          cluster_id: currentCluster?.id || -1,
          namespace: "ack-system",
          repo_url: capabilities?.default_addon_helm_repo_url,
        }
      );
    },
    [currentProject, currentCluster, capabilities]
  );

  return { create };
};
