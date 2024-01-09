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
  databaseName: z.string().nonempty("Database name is required"),
  masterUsername: z.string(),
  masterUserPassword: z
    .string()
    .nonempty("Master password is required")
    .default(""),
  allocatedStorageGigabytes: z
    .number()
    .int()
    .positive("Allocated storage must be a positive integer")
    .default(30),
});

export const dbFormValidator = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .regex(/^[a-z0-9-]+$/, {
      message: "Lowercase letters, numbers, and “-” only.",
    }),
  config: z.discriminatedUnion("type", [rdsPostgresConfigValidator]),
});
export type DbFormData = z.infer<typeof dbFormValidator>;

export type ResourceOption = {
  tier: InstanceTier;
  label: string;
  cpuCores: number;
  ramGigabytes: number;
  storageGigabytes: number;
};
