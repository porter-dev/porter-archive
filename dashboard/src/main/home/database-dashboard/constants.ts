import awsRDS from "assets/amazon-rds.png";
import awsElastiCache from "assets/aws-elasticache.png";

import {
  DATABASE_ENGINE_MEMCACHED,
  DATABASE_ENGINE_POSTGRES,
  DATABASE_ENGINE_REDIS,
  DATABASE_TYPE_AURORA,
  DATABASE_TYPE_ELASTICACHE,
  DATABASE_TYPE_RDS,
  type DatabaseTemplate,
} from "./types";

export const SUPPORTED_DATABASE_TEMPLATES: DatabaseTemplate[] = [
  {
    name: "Amazon RDS",
    type: DATABASE_TYPE_RDS,
    engine: DATABASE_ENGINE_POSTGRES,
    icon: awsRDS as string,
    description:
      "Amazon Relational Database Service (RDS) is a web service that makes it easier to set up, operate, and scale a relational database in the cloud.",
    disabled: false,
  },
  {
    name: "Amazon Aurora",
    type: DATABASE_TYPE_AURORA,
    engine: DATABASE_ENGINE_POSTGRES,
    icon: awsRDS as string,
    description:
      "Amazon Aurora PostgreSQL is an ACID–compliant relational database engine that combines the speed, reliability, and manageability of Amazon Aurora with the simplicity and cost-effectiveness of open-source databases.",
    disabled: false,
  },
  {
    name: "Amazon ElastiCache",
    type: DATABASE_TYPE_ELASTICACHE,
    engine: DATABASE_ENGINE_REDIS,
    icon: awsElastiCache as string,
    description:
      "Amazon ElastiCache is a web service that makes it easy to deploy, operate, and scale an in-memory data store or cache in the cloud.",
    disabled: false,
  },
  {
    name: "Amazon ElastiCache",
    type: DATABASE_TYPE_ELASTICACHE,
    engine: DATABASE_ENGINE_MEMCACHED,
    icon: awsElastiCache as string,
    description:
      "Currently unavailable. Please contact support@porter.run for more details.",
    disabled: true,
  },
];
