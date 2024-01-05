import { z } from "zod";

export const datastoreEnvValidator = z.object({
  name: z.string(),
  linked_applications: z.string().array().default([]),
  secret_variables: z.record(z.string()).default({}),
  variables: z.record(z.string()).default({}),
  version: z.number(),
});

export type DatastoreEnvWithSource = z.infer<typeof datastoreEnvValidator>;

export const datastoreMetadataValidator = z.object({
  name: z.string(),
  value: z.string().default(""),
});

export type DatastoreMetadataWithSource = z.infer<
  typeof datastoreMetadataValidator
>;

export const datastoreValidator = z.object({
  name: z.string(),
  type: z.string(),
  status: z.string().default(""),
  metadata: datastoreMetadataValidator.array().default([]),
  env: datastoreEnvValidator.optional(),
  connection_string: z.string().default(""),
});

export type DatastoreWithSource = z.infer<typeof datastoreValidator>;

export const datastoreListResponseValidator = z.object({
  datastores: datastoreValidator.array(),
});

export const cloudProviderValidator = z.object({
  cloud_provider_id: z.string(),
  project_id: z.number(),
});

export type CloudProviderWithSource = z.infer<typeof cloudProviderValidator>;

export const cloudProviderListResponseValidator = z.object({
  accounts: cloudProviderValidator.array(),
});

export const cloudProviderDatastoreSchema = z.object({
  project_id: z.number(),
  cloud_provider_name: z.string(),
  cloud_provider_id: z.string(),
  datastore: datastoreValidator,
});

export type CloudProviderDatastore = z.infer<
  typeof cloudProviderDatastoreSchema
>;

export type DatabaseEngine =
  | typeof DATABASE_ENGINE_POSTGRES
  | typeof DATABASE_ENGINE_REDIS
  | typeof DATABASE_ENGINE_MEMCACHED;
export const DATABASE_ENGINE_POSTGRES = {
  name: "postgres" as const,
  displayName: "PostgreSQL",
};
export const DATABASE_ENGINE_REDIS = {
  name: "redis" as const,
  displayName: "Redis",
};
export const DATABASE_ENGINE_MEMCACHED = {
  name: "memcached" as const,
  displayName: "Memcached",
};

export type DatabaseType =
  | typeof DATABASE_TYPE_RDS
  | typeof DATABASE_TYPE_AURORA
  | typeof DATABASE_TYPE_ELASTICACHE;
export const DATABASE_TYPE_RDS = "rds" as const;
export const DATABASE_TYPE_AURORA = "aurora" as const;
export const DATABASE_TYPE_ELASTICACHE = "elasticache" as const;

export type DatabaseTemplate = {
  type: DatabaseType;
  engine: DatabaseEngine;
  icon: string;
  name: string;
  description: string;
  disabled: boolean;
};
