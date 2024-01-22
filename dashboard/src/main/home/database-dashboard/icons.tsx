import {
  DATABASE_ENGINE_AURORA_POSTGRES,
  DATABASE_ENGINE_POSTGRES,
  DATABASE_ENGINE_REDIS,
  DATABASE_TYPE_ELASTICACHE,
  DATABASE_TYPE_RDS,
} from "lib/databases/types";

import awsRDS from "assets/amazon-rds.png";
import awsElasticache from "assets/aws-elasticache.png";
import engine from "assets/computer-chip.svg";
import database from "assets/database.svg";
import postgresql from "assets/postgresql.svg";
import redis from "assets/redis.svg";

const datastoreIcons: Record<string, string> = {
  [DATABASE_TYPE_ELASTICACHE]: awsElasticache,
  [DATABASE_TYPE_RDS]: awsRDS,
};

const engineIcons: Record<string, string> = {
  [DATABASE_ENGINE_POSTGRES.name]: postgresql,
  [DATABASE_ENGINE_AURORA_POSTGRES.name]: postgresql,
  [DATABASE_ENGINE_REDIS.name]: redis,
};

export const getDatastoreIcon = (datastoreType: string): string => {
  return datastoreIcons[datastoreType] ?? database;
};

export const getEngineIcon = (engineName: string): string => {
  return engineIcons[engineName] ?? engine;
};
