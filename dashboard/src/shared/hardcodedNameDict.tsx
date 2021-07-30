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
};

const hardcodedIcons: { [key: string]: string } = {
  "https-issuer":
    "https://cdn4.iconfinder.com/data/icons/macster-2/100/https__-512.png",
  metabase:
    "https://pbs.twimg.com/profile_images/961380992727465985/4unoiuHt.jpg",
  mongodb:
    "https://bitnami.com/assets/stacks/mongodb/img/mongodb-stack-220x234.png",
  datadog: "https://datadog-live.imgix.net/img/dd_logo_70x75.png",
  wallarm:
    "https://assets.website-files.com/5fe3434623c64c793987363d/6006cb97f71f76f8a5e85a32_Frame%201923.png",
  agones: "https://avatars.githubusercontent.com/u/36940055?v=4",
  mysql: "https://www.mysql.com/common/logos/logo-mysql-170x115.png",
  postgresql:
    "https://bitnami.com/assets/stacks/postgresql/img/postgresql-stack-110x117.png",
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
    "https://bitnami.com/assets/stacks/rabbitmq/img/rabbitmq-stack-220x234.png",
  logdna:
    "https://user-images.githubusercontent.com/65516095/118185526-a2447480-b40a-11eb-9bdb-82aa0a306f26.png",
  "tailscale-relay": "Tailscale",
};

export { hardcodedNames, hardcodedIcons };
