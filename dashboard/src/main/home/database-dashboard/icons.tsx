import {
  DATABASE_TYPE_ELASTICACHE,
  DATABASE_TYPE_RDS,
} from "lib/databases/types";

import awsRDS from "assets/amazon-rds.png";
import awsElasticache from "assets/aws-elasticache.png";

export const datastoreIcons: Record<string, string> = {
  [DATABASE_TYPE_ELASTICACHE]: awsElasticache,
  [DATABASE_TYPE_RDS]: awsRDS,
};

export const getDatastoreIcon = (datastoreType: string): string => {
  return datastoreIcons[datastoreType] ?? awsRDS;
};
