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
  ]),
});

export type SerializedDatastore = z.infer<typeof datastoreValidator>;

export type ClientDatastore = SerializedDatastore & {
  template: DatabaseTemplate;
};

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

export type DatabaseEngine = {
  name: z.infer<typeof datastoreValidator>["engine"];
  displayName: string;
};
export const DATABASE_ENGINE_POSTGRES = {
  name: "POSTGRES" as const,
  displayName: "PostgreSQL",
};
export const DATABASE_ENGINE_AURORA_POSTGRES = {
  name: "AURORA-POSTGRES" as const,
  displayName: "Aurora PostgreSQL",
};
export const DATABASE_ENGINE_REDIS = {
  name: "REDIS" as const,
  displayName: "Redis",
};
export const DATABASE_ENGINE_MEMCACHED = {
  name: "MEMCACHED" as const,
  displayName: "Memcached",
};

export type DatabaseType = z.infer<typeof datastoreValidator>["type"];
export const DATABASE_TYPE_RDS = "RDS" as const;
export const DATABASE_TYPE_ELASTICACHE = "ELASTICACHE" as const;

export type DatabaseState = {
  state: z.infer<typeof datastoreValidator>["status"];
  displayName: string;
};
export const DATABASE_STATE_CREATING: DatabaseState = {
  state: "CREATING",
  displayName: "Creating",
};
export const DATABASE_STATE_CONFIGURING_LOG_EXPORTS: DatabaseState = {
  state: "CONFIGURING_LOG_EXPORTS",
  displayName: "Configuring log exports",
};
export const DATABASE_STATE_MODIFYING: DatabaseState = {
  state: "MODIFYING",
  displayName: "Modifying",
};
export const DATABASE_STATE_CONFIGURING_ENHANCED_MONITORING: DatabaseState = {
  state: "CONFIGURING_ENHANCED_MONITORING",
  displayName: "Configuring enhanced monitoring",
};
export const DATABASE_STATE_BACKING_UP: DatabaseState = {
  state: "BACKING_UP",
  displayName: "Backing up",
};
export const DATABASE_STATE_AVAILABLE: DatabaseState = {
  state: "AVAILABLE",
  displayName: "Finishing provision",
};

export type DatabaseTemplate = {
  type: DatabaseType;
  engine: DatabaseEngine;
  icon: string;
  name: string;
  description: string;
  disabled: boolean;
  instanceTiers: ResourceOption[];
  formTitle: string;
  creationStateProgression: DatabaseState[];
};

const instanceTierValidator = z.enum([
  "unspecified",
  "db.t4g.small",
  "db.t4g.medium",
  "db.t4g.large",
  "cache.t4g.micro",
  "cache.t4g.medium",
  "cache.r7g.large",
  "cache.r7g.xlarge",
]);
export type InstanceTier = z.infer<typeof instanceTierValidator>;

const rdsPostgresConfigValidator = z.object({
  type: z.literal("rds-postgres"),
  instanceClass: instanceTierValidator
    .default("unspecified")
    .refine((val) => val !== "unspecified", {
      message: "Instance class is required",
    }),
  allocatedStorageGigabytes: z
    .number()
    .int()
    .positive("Allocated storage must be a positive integer")
    .default(30),
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
      message: "Instance class is required",
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
      message: "Instance class is required",
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
