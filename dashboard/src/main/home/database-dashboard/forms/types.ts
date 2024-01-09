import { z } from "zod";

export type AuroraPostgresFormValues = {
  name: string;
  databaseName: string;
  masterUsername: string;
  masterUserPassword: string;
  allocatedStorage: number;
  instanceClass: string;
};

export type ElasticacheRedisFormValues = {
  name: string;
  databaseName: string;
  masterUsername: string;
  masterUserPassword: string;
  instanceClass: string;
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
});
export type DbFormData = z.infer<typeof dbFormValidator>;

export type ResourceOption = {
  tier: InstanceTier;
  label: string;
  cpuCores: number;
  ramGigabytes: number;
  storageGigabytes: number;
};
