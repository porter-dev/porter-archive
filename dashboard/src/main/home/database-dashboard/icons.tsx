import awsRDS from "assets/amazon-rds.png";
import awsElasticache from "assets/aws-elasticache.png";

export const datastoreIcons: Record<string, string> = {
  ENUM_DATASTORE_ELASTICACHE_REDIS: awsElasticache,
  ENUM_DATASTORE_ELASTICACHE_MEMCACHED: awsElasticache,
  ENUM_DATASTORE_RDS_POSTGRESQL: awsRDS,
  ENUM_DATASTORE_RDS_MYSQL: awsRDS,
  ENUM_DATASTORE_RDS_AURORA_POSTGRESQL: awsRDS,
};
