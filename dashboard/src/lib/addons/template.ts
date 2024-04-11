export type AddonTemplateTag =
  | "Monitoring"
  | "Logging"
  | "Analytics"
  | "Networking"
  | "Database";

export const AddonTemplateTagColor: {
  [key in AddonTemplateTag]: string;
} = {
  Monitoring: "#774B9E",
  Logging: "#F72585",
  Analytics: "#1CCAD8",
  Networking: "#FF680A",
  Database: "#5FAD56",
};

export type AddonTemplate = {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  tags: AddonTemplateTag[];
};

export const ADDON_TEMPLATE_REDIS: AddonTemplate = {
  name: "Redis",
  displayName: "Redis",
  description: "An in-memory database that persists on disk.",
  icon: "https://cdn4.iconfinder.com/data/icons/redis-2/1451/Untitled-2-512.png",
  tags: ["Database"],
};

export const ADDON_TEMPLATE_POSTGRES: AddonTemplate = {
  name: "Postgres",
  displayName: "Postgres",
  description: "An object-relational database system.",
  icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",
  tags: ["Database"],
};

export const ADDON_TEMPLATE_DATADOG: AddonTemplate = {
  name: "Datadog",
  displayName: "Datadog",
  description: "DataDog Agent",
  icon: "https://datadog-live.imgix.net/img/dd_logo_70x75.png",
  tags: ["Monitoring"],
};

export const SUPPORTED_ADDON_TEMPLATES: AddonTemplate[] = [
  ADDON_TEMPLATE_DATADOG,
];
