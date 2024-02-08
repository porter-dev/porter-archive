import {
  DATASTORE_ENGINE_AURORA_POSTGRES,
  DATASTORE_ENGINE_MEMCACHED,
  DATASTORE_ENGINE_POSTGRES,
  DATASTORE_ENGINE_REDIS,
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
  DATASTORE_TYPE_RDS,
  type DatastoreTemplate,
} from "lib/databases/types";

import awsRDS from "assets/amazon-rds.png";
import awsElastiCache from "assets/aws-elasticache.png";

export const SUPPORTED_DATASTORE_TEMPLATES: DatastoreTemplate[] = [
  Object.freeze({
    name: "Amazon RDS",
    type: DATASTORE_TYPE_RDS,
    engine: DATASTORE_ENGINE_POSTGRES,
    icon: awsRDS as string,
    description:
      "Amazon Relational Database Service (RDS) is a web service that makes it easier to set up, operate, and scale a relational database in the cloud.",
    disabled: false,
    instanceTiers: [
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
  }),
  Object.freeze({
    name: "Amazon Aurora",
    type: DATASTORE_TYPE_RDS,
    engine: DATASTORE_ENGINE_AURORA_POSTGRES,
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
  }),
  Object.freeze({
    name: "Amazon ElastiCache",
    type: DATASTORE_TYPE_ELASTICACHE,
    engine: DATASTORE_ENGINE_REDIS,
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
  }),
  Object.freeze({
    name: "Amazon ElastiCache",
    type: DATASTORE_TYPE_ELASTICACHE,
    engine: DATASTORE_ENGINE_MEMCACHED,
    icon: awsElastiCache as string,
    description:
      "Currently unavailable. Please contact support@porter.run for more details.",
    disabled: true,
    instanceTiers: [],
    formTitle: "Create an ElastiCache Memcached instance",
    creationStateProgression: [],
    deletionStateProgression: [],
  }),
];
