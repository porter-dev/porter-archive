import {
  DATASTORE_ENGINE_AURORA_POSTGRES,
  DATASTORE_ENGINE_POSTGRES,
  DATASTORE_ENGINE_REDIS,
  DATASTORE_TYPE_ELASTICACHE,
  DATASTORE_TYPE_RDS,
} from "lib/databases/types";

import awsRDS from "assets/amazon-rds.png";
import awsElasticache from "assets/aws-elasticache.png";
import engine from "assets/computer-chip.svg";
import database from "assets/database.svg";
import postgresql from "assets/postgresql.svg";
import redis from "assets/redis.svg";

const datastoreIcons: Record<string, string> = {
  [DATASTORE_TYPE_ELASTICACHE.name]: awsElasticache,
  [DATASTORE_TYPE_RDS.name]: awsRDS,
};

const engineIcons: Record<string, string> = {
  [DATASTORE_ENGINE_POSTGRES.name]: postgresql,
  [DATASTORE_ENGINE_AURORA_POSTGRES.name]: postgresql,
  [DATASTORE_ENGINE_REDIS.name]: redis,
};

export const getDatastoreIcon = (datastoreType: string): string => {
  return datastoreIcons[datastoreType] ?? database;
};

export const getEngineIcon = (engineName: string): string => {
  return engineIcons[engineName] ?? engine;
};
