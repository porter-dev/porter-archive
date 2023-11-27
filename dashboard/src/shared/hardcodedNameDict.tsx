import awsRDS from "assets/amazon-rds.png";
import awsElasticache from "assets/aws-elasticache.png";
import lightning from "../assets/lightning.png";

const hardcodedNames: { [key: string]: string } = {
  agones: "Agones System",
  docker: "Docker",
  "https-issuer": "HTTPS Issuer",
  metabase: "Metabase",
  mongodb: "MongoDB",
  datadog: "Datadog",
  "wallarm-ingress": "Wallarm Ingress",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  redis: "Redis",
  "node-local": "Node Local DNS",
  ubuntu: "Ubuntu",
  web: "Web Service",
  worker: "Worker",
  job: "Job",
  "cert-manager": "Cert Manager",
  elasticsearch: "Elasticsearch",
  prometheus: "Prometheus",
  rabbitmq: "RabbitMQ",
  logdna: "LogDNA",
  "tailscale-relay": "Tailscale",
  questdb: "QuestDB",
  "postgres-toolbox": "PostgreSQL Toolbox",
  keda: "KEDA",
  "grafana-agent": "Grafana Agent",
  "ecr-secrets-updater": "ECR Secrets Updater",
  "nri-bundle": "New Relic",
};

const hardcodedIcons: { [key: string]: string } = {
  "elasticache-redis": awsElasticache,
  "https-issuer":
    "https://cdn4.iconfinder.com/data/icons/macster-2/100/https__-512.png",
  metabase:
    "https://pbs.twimg.com/profile_images/961380992727465985/4unoiuHt.jpg",
  mongodb:
    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
  datadog: "https://datadog-live.imgix.net/img/dd_logo_70x75.png",
  wallarm:
    "https://assets.website-files.com/5fe3434623c64c793987363d/6006cb97f71f76f8a5e85a32_Frame%201923.png",
  agones: "https://avatars.githubusercontent.com/u/36940055?v=4",
  mysql: "https://www.mysql.com/common/logos/logo-mysql-170x115.png",
  postgresql:
    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",
  "rds-postgresql": awsRDS,
  "rds-postgresql-aurora": awsRDS,
  redis:
    "https://cdn4.iconfinder.com/data/icons/redis-2/1451/Untitled-2-512.png",
  ubuntu: "Ubuntu",
  web:
    "https://user-images.githubusercontent.com/65516095/111255214-07d3da80-85ed-11eb-99e2-fddcbdb99bdb.png",
  worker:
    "https://user-images.githubusercontent.com/65516095/111255250-1b7f4100-85ed-11eb-8bd1-7b17be3e0e06.png",
  job:
    "https://user-images.githubusercontent.com/65516095/111258413-4e2c3800-85f3-11eb-8a6a-88e03460f8fe.png",
  "cert-manager":
    "https://raw.githubusercontent.com/jetstack/cert-manager/master/logo/logo.png",
  elasticsearch:
    "https://ria.gallerycdn.vsassets.io/extensions/ria/elastic/0.13.3/1530754501320/Microsoft.VisualStudio.Services.Icons.Default",
  prometheus:
    "https://raw.githubusercontent.com/prometheus/prometheus.github.io/master/assets/prometheus_logo-cb55bb5c346.png",
  rabbitmq:
    "https://static-00.iconduck.com/assets.00/rabbitmq-icon-484x512-s9lfaapn.png",
  logdna:
    "https://user-images.githubusercontent.com/65516095/118185526-a2447480-b40a-11eb-9bdb-82aa0a306f26.png",
  "node-local": "https://hostingdata.co.uk/wp-content/uploads/2020/06/dns-png-6.png",
  "tailscale-relay": "https://play-lh.googleusercontent.com/wczDL05-AOb39FcL58L32h6j_TrzzGTXDLlOrOmJ-aNsnoGsT1Gkk2vU4qyTb7tGxRw=w240-h480-rw",
  "postgres-toolbox": "https://cdn-icons-png.flaticon.com/512/5133/5133626.png",
  "ecr-secrets-updater": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg",
  "porter-agent": lightning,
};

const DISPLAY_TAGS_MAP = {
  "ANALYITCS": { label: "Analytics", color: "#1CCAD8" },
  "NETWORKING": { label: "Networking", color: "#FF680A" },
  "DATA_BASE": { label: "Database", color: "#5FAD56" },
  "LOGGING": { label: "Logging", color: "#F72585" },
  "MONITORING": { label: "Monitoring", color: "#774B9E" },
  "CACHE": { label: "Cache", color: "#F72C25" },
  "SEARCH": { label: "Search", color: "#F7B32B" },
  "MISC": { label: "Misc.", color: "#616163" },
};

export { DISPLAY_TAGS_MAP, hardcodedIcons, hardcodedNames };

