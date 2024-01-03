import awsRDS from "assets/amazon-rds.png";
import awsElasticache from "assets/aws-elasticache.png";

export const datastoreIcons: { [key: string]: string } = {
  "ELASTICACHE_REDIS": awsElasticache,
  "ELASTICACHE_MEMCACHED": awsElasticache,
  "ENUM_DATASTORE_RDS_POSTGRESQL": awsRDS,
  "ENUM_DATASTORE_RDS_MYSQL": awsRDS,
  "ENUM_DATASTORE_RDS_AURORA_POSTGRESQL": awsRDS,
};

