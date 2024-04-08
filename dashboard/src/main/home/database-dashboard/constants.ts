import {
  DATASTORE_STATE_AVAILABLE,
  DATASTORE_STATE_AWAITING_DELETION,
  DATASTORE_STATE_BACKING_UP,
  DATASTORE_STATE_CONFIGURING_ENHANCED_MONITORING,
  DATASTORE_STATE_CONFIGURING_LOG_EXPORTS,
  DATASTORE_STATE_CREATING,
  DATASTORE_STATE_DELETED,
  DATASTORE_STATE_DELETING_PARAMETER_GROUP,
  DATASTORE_STATE_DELETING_RECORD,
  DATASTORE_STATE_DELETING_REPLICATION_GROUP,
  DATASTORE_STATE_MODIFYING,
  DATASTORE_TYPE_ELASTICACHE,
  DATASTORE_TYPE_MANAGED_POSTGRES,
  DATASTORE_TYPE_MANAGED_REDIS,
  DATASTORE_TYPE_RDS,
  type DatastoreEngine,
  type DatastoreTemplate,
} from "lib/databases/types";

import awsRDS from "assets/amazon-rds.png";
import awsElastiCache from "assets/aws-elasticache.png";
import infra from "assets/cluster.svg";
import postgresql from "assets/postgresql.svg";
import redis from "assets/redis.svg";

export const DATASTORE_ENGINE_POSTGRES: DatastoreEngine = {
  name: "POSTGRES" as const,
  displayName: "PostgreSQL",
  icon: postgresql as string,
};
export const DATASTORE_ENGINE_AURORA_POSTGRES: DatastoreEngine = {
  name: "AURORA-POSTGRES" as const,
  displayName: "Aurora PostgreSQL",
  icon: postgresql as string,
};
export const DATASTORE_ENGINE_REDIS: DatastoreEngine = {
  name: "REDIS" as const,
  displayName: "Redis",
  icon: redis as string,
};
export const DATASTORE_ENGINE_MEMCACHED: DatastoreEngine = {
  name: "MEMCACHED" as const,
  displayName: "Memcached",
  icon: redis as string,
};

export const DATASTORE_TEMPLATE_AWS_RDS: DatastoreTemplate = Object.freeze({
  name: "Amazon RDS",
  displayName: "Amazon RDS",
  highLevelType: DATASTORE_ENGINE_POSTGRES,
  type: DATASTORE_TYPE_RDS,
  engine: DATASTORE_ENGINE_POSTGRES,
  supportedEngineVersions: [
    { name: "15.4" as const, displayName: "PostgreSQL 15.4" },
    { name: "14.11" as const, displayName: "PostgreSQL 14.11" },
  ],
  icon: awsRDS as string,
  description:
    "Amazon Relational Database Service (RDS) is a web service that makes it easier to set up, operate, and scale a relational database in the cloud.",
  disabled: false,
  instanceTiers: [
    {
      tier: "db.t4g.micro" as const,
      label: "Micro",
      cpuCores: 2,
      ramGigabytes: 1,
      storageGigabytes: 20,
    },
    {
      tier: "db.t4g.small" as const,
      label: "Small",
      cpuCores: 2,
      ramGigabytes: 2,
      storageGigabytes: 30,
    },
    {
      tier: "db.t4g.medium" as const,
      label: "Medium",
      cpuCores: 2,
      ramGigabytes: 4,
      storageGigabytes: 100,
    },
    {
      tier: "db.t4g.large" as const,
      label: "Large",
      cpuCores: 2,
      ramGigabytes: 8,
      storageGigabytes: 256,
    },
    {
      tier: "db.m6g.large" as const,
      label: "Large (High Performance)",
      cpuCores: 2,
      ramGigabytes: 8,
      storageGigabytes: 512,
    },
  ],
  formTitle: "Create an RDS PostgreSQL instance",
  creationStateProgression: [
    DATASTORE_STATE_CREATING,
    DATASTORE_STATE_CONFIGURING_LOG_EXPORTS,
    DATASTORE_STATE_MODIFYING,
    DATASTORE_STATE_CONFIGURING_ENHANCED_MONITORING,
    DATASTORE_STATE_BACKING_UP,
    DATASTORE_STATE_AVAILABLE,
  ],
  deletionStateProgression: [
    DATASTORE_STATE_AWAITING_DELETION,
    DATASTORE_STATE_DELETING_RECORD,
    DATASTORE_STATE_DELETED,
  ],
});
export const DATASTORE_TEMPLATE_AWS_AURORA: DatastoreTemplate = Object.freeze({
  name: "Amazon Aurora",
  displayName: "Amazon Aurora PostgreSQL",
  highLevelType: DATASTORE_ENGINE_POSTGRES,
  type: DATASTORE_TYPE_RDS,
  engine: DATASTORE_ENGINE_AURORA_POSTGRES,
  supportedEngineVersions: [],
  icon: awsRDS as string,
  description:
    "Amazon Aurora PostgreSQL is an ACID–compliant relational database engine that combines the speed, reliability, and manageability of Amazon Aurora with the simplicity and cost-effectiveness of open-source databases.",
  disabled: false,
  instanceTiers: [
    {
      tier: "db.t4g.medium" as const,
      label: "Medium",
      cpuCores: 2,
      ramGigabytes: 4,
      storageGigabytes: 100,
    },
    {
      tier: "db.t4g.large" as const,
      label: "Large",
      cpuCores: 4,
      ramGigabytes: 8,
      storageGigabytes: 256,
    },
  ],
  formTitle: "Create an Aurora PostgreSQL instance",
  creationStateProgression: [
    DATASTORE_STATE_CREATING,
    DATASTORE_STATE_AVAILABLE,
  ],
  deletionStateProgression: [
    DATASTORE_STATE_AWAITING_DELETION,
    DATASTORE_STATE_DELETING_RECORD,
    DATASTORE_STATE_DELETED,
  ],
});
export const DATASTORE_TEMPLATE_AWS_ELASTICACHE: DatastoreTemplate =
  Object.freeze({
    name: "Amazon ElastiCache",
    displayName: "Amazon ElastiCache Redis",
    highLevelType: DATASTORE_ENGINE_REDIS,
    type: DATASTORE_TYPE_ELASTICACHE,
    engine: DATASTORE_ENGINE_REDIS,
    supportedEngineVersions: [],
    icon: awsElastiCache as string,
    description:
      "Amazon ElastiCache is a web service that makes it easy to deploy, operate, and scale an in-memory data store or cache in the cloud.",
    disabled: false,
    instanceTiers: [
      {
        tier: "cache.t4g.micro" as const,
        label: "Micro",
        cpuCores: 2,
        ramGigabytes: 0.5,
        storageGigabytes: 0,
      },
      {
        tier: "cache.t4g.medium" as const,
        label: "Medium",
        cpuCores: 2,
        ramGigabytes: 3,
        storageGigabytes: 0,
      },
      {
        tier: "cache.r6g.large" as const,
        label: "Large",
        cpuCores: 2,
        ramGigabytes: 13,
        storageGigabytes: 0,
      },
      {
        tier: "cache.r6g.xlarge" as const,
        label: "Extra Large",
        cpuCores: 4,
        ramGigabytes: 26,
        storageGigabytes: 0,
      },
    ],
    formTitle: "Create an ElastiCache Redis instance",
    creationStateProgression: [
      DATASTORE_STATE_CREATING,
      DATASTORE_STATE_MODIFYING,
      DATASTORE_STATE_AVAILABLE,
    ],
    deletionStateProgression: [
      DATASTORE_STATE_AWAITING_DELETION,
      DATASTORE_STATE_DELETING_REPLICATION_GROUP,
      DATASTORE_STATE_DELETING_PARAMETER_GROUP,
      DATASTORE_STATE_DELETING_RECORD,
      DATASTORE_STATE_DELETED,
    ],
  });
export const DATASTORE_TEMPLATE_MANAGED_REDIS: DatastoreTemplate =
  Object.freeze({
    name: "Managed Redis",
    displayName: "Cluster-managed Redis",
    highLevelType: DATASTORE_ENGINE_POSTGRES,
    type: DATASTORE_TYPE_MANAGED_REDIS,
    engine: DATASTORE_ENGINE_REDIS,
    supportedEngineVersions: [],
    icon: infra as string,
    description: "A redis cluster hosted on your Porter cluster.",
    disabled: true,
    instanceTiers: [
      {
        tier: "db.t4g.micro" as const,
        label: "Micro",
        cpuCores: 1,
        ramGigabytes: 1,
        storageGigabytes: 1,
      },
      {
        tier: "db.t4g.small" as const,
        label: "Small",
        cpuCores: 2,
        ramGigabytes: 2,
        storageGigabytes: 2,
      },
    ],
    formTitle: "Create an ElastiCache Memcached instance",
    creationStateProgression: [
      DATASTORE_STATE_CREATING,
      DATASTORE_STATE_AVAILABLE,
    ],
    deletionStateProgression: [
      DATASTORE_STATE_AWAITING_DELETION,
      DATASTORE_STATE_DELETING_RECORD,
      DATASTORE_STATE_DELETED,
    ],
  });
export const DATASTORE_TEMPLATE_MANAGED_POSTGRES: DatastoreTemplate =
  Object.freeze({
    name: "Managed PostgreSQL",
    displayName: "Cluster-managed PostgreSQL",
    highLevelType: DATASTORE_ENGINE_REDIS,
    type: DATASTORE_TYPE_MANAGED_POSTGRES,
    engine: DATASTORE_ENGINE_POSTGRES,
    supportedEngineVersions: [],
    icon: infra as string,
    description: "A postgresql instance hosted on your Porter cluster.",
    disabled: true,
    instanceTiers: [
      {
        tier: "db.t4g.micro" as const,
        label: "Micro",
        cpuCores: 1,
        ramGigabytes: 1,
        storageGigabytes: 1,
      },
      {
        tier: "db.t4g.small" as const,
        label: "Small",
        cpuCores: 2,
        ramGigabytes: 2,
        storageGigabytes: 2,
      },
    ],
    formTitle: "Create a managed PostgreSQL instance",
    creationStateProgression: [
      DATASTORE_STATE_CREATING,
      DATASTORE_STATE_AVAILABLE,
    ],
    deletionStateProgression: [
      DATASTORE_STATE_AWAITING_DELETION,
      DATASTORE_STATE_DELETING_RECORD,
      DATASTORE_STATE_DELETED,
    ],
  });

export const SUPPORTED_DATASTORE_TEMPLATES: DatastoreTemplate[] = [
  DATASTORE_TEMPLATE_AWS_RDS,
  DATASTORE_TEMPLATE_AWS_AURORA,
  DATASTORE_TEMPLATE_AWS_ELASTICACHE,
  DATASTORE_TEMPLATE_MANAGED_POSTGRES,
  DATASTORE_TEMPLATE_MANAGED_REDIS,
];
