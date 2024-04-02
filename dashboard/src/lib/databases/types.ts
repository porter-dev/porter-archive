import { z } from "zod";

import { cloudProviderValidator } from "lib/clusters/types";

export const datastoreEnvValidator = z.object({
  name: z.string(),
  linked_applications: z.string().array().default([]),
  secret_variables: z.record(z.string()).default({}),
  variables: z.record(z.string()).default({}),
});

export type DatastoreEnvWithSource = z.infer<typeof datastoreEnvValidator>;

export const datastoreMetadataValidator = z.object({
  name: z.string(),
  value: z.string().default(""),
});

export type DatastoreMetadataWithSource = z.infer<
  typeof datastoreMetadataValidator
>;
export const datastoreCredentialValidator = z.object({
  host: z.string().optional().default(""),
  port: z.number().optional().default(0),
  username: z.string().optional().default(""),
  database_name: z.string().optional().default(""),
  password: z.string().optional().default(""),
});
export type DatastoreConnectionInfo = z.infer<
  typeof datastoreCredentialValidator
>;

export const datastoreValidator = z.object({
  name: z.string(),
  type: z.enum(["RDS", "ELASTICACHE"]),
  engine: z.enum(["POSTGRES", "AURORA-POSTGRES", "REDIS", "MEMCACHED"]),
  created_at: z.string().default(""),
  metadata: datastoreMetadataValidator.array().default([]),
  env: datastoreEnvValidator.optional(),
  connection_string: z.string().default(""),
  status: z.enum([
    "",
    "CREATING",
    "CONFIGURING_LOG_EXPORTS",
    "MODIFYING",
    "CONFIGURING_ENHANCED_MONITORING",
    "BACKING_UP",
    "AVAILABLE",
    "AWAITING_DELETION",
    "DELETING_REPLICATION_GROUP",
    "DELETING_PARAMETER_GROUP",
    "DELETING_RECORD",
    "DELETED",
  ]),
  cloud_provider: z.string().pipe(cloudProviderValidator.catch("UNKNOWN")),
  cloud_provider_credential_identifier: z.string(),
  credential: datastoreCredentialValidator,
  connected_cluster_ids: z.number().array().optional().default([]),
  on_management_cluster: z.boolean().default(false),
});

export type SerializedDatastore = z.infer<typeof datastoreValidator>;

export type ClientDatastore = SerializedDatastore & {
  template: DatastoreTemplate;
};

export const datastoreListResponseValidator = z.object({
  datastores: datastoreValidator.array(),
});

export type DatastoreEngine = {
  name: z.infer<typeof datastoreValidator>["engine"];
  displayName: string;
};
export const DATASTORE_ENGINE_POSTGRES = {
  name: "POSTGRES" as const,
  displayName: "PostgreSQL",
};
export const DATASTORE_ENGINE_AURORA_POSTGRES = {
  name: "AURORA-POSTGRES" as const,
  displayName: "Aurora PostgreSQL",
};
export const DATASTORE_ENGINE_REDIS = {
  name: "REDIS" as const,
  displayName: "Redis",
};
export const DATASTORE_ENGINE_MEMCACHED = {
  name: "MEMCACHED" as const,
  displayName: "Memcached",
};

export type DatastoreType = {
  name: z.infer<typeof datastoreValidator>["type"];
  displayName: string;
};
export const DATASTORE_TYPE_RDS: DatastoreType = {
  name: "RDS" as const,
  displayName: "RDS",
};
export const DATASTORE_TYPE_ELASTICACHE: DatastoreType = {
  name: "ELASTICACHE" as const,
  displayName: "ElastiCache",
};

export type DatastoreState = {
  state: z.infer<typeof datastoreValidator>["status"];
  displayName: string;
};
export const DATASTORE_STATE_CREATING: DatastoreState = {
  state: "CREATING",
  displayName: "Creating",
};
export const DATASTORE_STATE_CONFIGURING_LOG_EXPORTS: DatastoreState = {
  state: "CONFIGURING_LOG_EXPORTS",
  displayName: "Configuring log exports",
};
export const DATASTORE_STATE_MODIFYING: DatastoreState = {
  state: "MODIFYING",
  displayName: "Modifying",
};
export const DATASTORE_STATE_CONFIGURING_ENHANCED_MONITORING: DatastoreState = {
  state: "CONFIGURING_ENHANCED_MONITORING",
  displayName: "Configuring enhanced monitoring",
};
export const DATASTORE_STATE_BACKING_UP: DatastoreState = {
  state: "BACKING_UP",
  displayName: "Backing up",
};
export const DATASTORE_STATE_AVAILABLE: DatastoreState = {
  state: "AVAILABLE",
  displayName: "Finishing provision",
};
export const DATASTORE_STATE_AWAITING_DELETION: DatastoreState = {
  state: "AWAITING_DELETION",
  displayName: "Awaiting deletion",
};
export const DATASTORE_STATE_DELETING_REPLICATION_GROUP: DatastoreState = {
  state: "DELETING_REPLICATION_GROUP",
  displayName: "Deleting replication group",
};
export const DATASTORE_STATE_DELETING_PARAMETER_GROUP: DatastoreState = {
  state: "DELETING_PARAMETER_GROUP",
  displayName: "Deleting parameter group",
};
export const DATASTORE_STATE_DELETING_RECORD: DatastoreState = {
  state: "DELETING_RECORD",
  displayName: "Deleting all resources",
};
export const DATASTORE_STATE_DELETED: DatastoreState = {
  state: "DELETED",
  displayName: "Wrapping up",
};

export type DatastoreTemplate = {
  type: DatastoreType;
  engine: DatastoreEngine;
  icon: string;
  name: string;
  description: string;
  disabled: boolean;
  instanceTiers: ResourceOption[];
  supportedEngineVersions: EngineVersion[];
  formTitle: string;
  creationStateProgression: DatastoreState[];
  deletionStateProgression: DatastoreState[];
};

const instanceTierValidator = z.enum([
  "unspecified",
  "db.t4g.micro",
  "db.t4g.small",
  "db.t4g.medium",
  "db.t4g.large",
  "db.m6g.large",
  "cache.t4g.micro",
  "cache.t4g.medium",
  "cache.r6g.large",
  "cache.r6g.xlarge",
]);
export type InstanceTier = z.infer<typeof instanceTierValidator>;

const engineVersionValidator = z.enum(["15.4", "14.11"]);
export type EngineVersion = {
  name: z.infer<typeof engineVersionValidator>;
  displayName: string;
};

const rdsPostgresConfigValidator = z.object({
  type: z.literal("rds-postgres"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance tier is required",
    }),
  allocatedStorageGigabytes: z
    .number()
    .int()
    .positive("Allocated storage must be a positive integer")
    .default(30),
  engineVersion: engineVersionValidator,
  // the following three are not yet specified by the user during creation - only parsed from the backend after the form is submitted
  databaseName: z
    .string()
    .nonempty("Database name is required")
    .default("postgres"),
  masterUsername: z
    .string()
    .nonempty("Master username is required")
    .default("postgres"),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
});

const auroraPostgresConfigValidator = z.object({
  type: z.literal("rds-postgresql-aurora"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance tier is required",
    }),
  allocatedStorageGigabytes: z
    .number()
    .int()
    .positive("Allocated storage must be a positive integer")
    .default(30),
  // the following three are not yet specified by the user during creation - only parsed from the backend after the form is submitted
  databaseName: z.string().nonempty("Database name is required").default(""),
  masterUsername: z
    .string()
    .nonempty("Master username is required")
    .default(""),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
});

const elasticacheRedisConfigValidator = z.object({
  type: z.literal("elasticache-redis"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance tier is required",
    }),
  // the following three are not yet specified by the user during creation - only parsed from the backend after the form is submitted
  databaseName: z.string().nonempty("Database name is required").default(""),
  masterUsername: z
    .string()
    .nonempty("Master username is required")
    .default(""),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
  engineVersion: z.string().default("7.1"),
});

export const dbFormValidator = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .regex(/^[a-z0-9-]+$/, {
      message: "Lowercase letters, numbers, and “-” only.",
    }),
  config: z.discriminatedUnion("type", [
    rdsPostgresConfigValidator,
    auroraPostgresConfigValidator,
    elasticacheRedisConfigValidator,
  ]),
  clusterId: z.number(),
});
export type DbFormData = z.infer<typeof dbFormValidator>;

export type ResourceOption = {
  tier: InstanceTier;
  label: string;
  cpuCores: number;
  ramGigabytes: number;
  storageGigabytes: number;
};
