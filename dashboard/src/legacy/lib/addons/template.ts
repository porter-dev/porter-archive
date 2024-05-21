import quivr from "legacy/assets/quivr.png";

import Logs from "main/home/add-on-dashboard/common/Logs";
import Settings from "main/home/add-on-dashboard/common/Settings";
import DatadogForm from "main/home/add-on-dashboard/datadog/DatadogForm";
import MetabaseForm from "main/home/add-on-dashboard/metabase/MetabaseForm";
import MezmoForm from "main/home/add-on-dashboard/mezmo/MezmoForm";
import NewRelicForm from "main/home/add-on-dashboard/newrelic/NewRelicForm";
import QuivrForm from "main/home/add-on-dashboard/quivr/QuivrForm";
import TailscaleForm from "main/home/add-on-dashboard/tailscale/TailscaleForm";
import TailscaleOverview from "main/home/add-on-dashboard/tailscale/TailscaleOverview";

import { type ClientAddon, type ClientAddonType } from ".";

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

export type AddonTab = {
  name: string;
  displayName: string;
  component: React.FC;
  isOnlyForPorterOperators?: boolean;
};

export const DEFAULT_ADDON_TAB = {
  name: "configuration",
  displayName: "Configuration",
  component: () => null,
};

export type AddonTemplate<T extends ClientAddonType> = {
  type: T;
  displayName: string;
  description: string;
  icon: string;
  tags: AddonTemplateTag[];
  tabs: AddonTab[]; // this what is rendered on the dashboard after the addon is deployed
  defaultValues: ClientAddon["config"] & { type: T };
};

export const ADDON_TEMPLATE_REDIS: AddonTemplate<"redis"> = {
  type: "redis",
  displayName: "Redis",
  description: "An in-memory database that persists on disk.",
  icon: "https://cdn4.iconfinder.com/data/icons/redis-2/1451/Untitled-2-512.png",
  tags: ["Database"],
  tabs: [],
  defaultValues: {
    type: "redis",
    cpuCores: {
      value: 0.5,
      readOnly: false,
    },
    ramMegabytes: {
      value: 512,
      readOnly: false,
    },
    storageGigabytes: {
      value: 1,
      readOnly: false,
    },
    password: "",
  },
};

export const ADDON_TEMPLATE_POSTGRES: AddonTemplate<"postgres"> = {
  type: "postgres",
  displayName: "Postgres",
  description: "An object-relational database system.",
  icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",
  tags: ["Database"],
  tabs: [],
  defaultValues: {
    type: "postgres",
    cpuCores: {
      value: 0.5,
      readOnly: false,
    },
    ramMegabytes: {
      value: 512,
      readOnly: false,
    },
    storageGigabytes: {
      value: 1,
      readOnly: false,
    },
    username: "postgres",
    password: "postgres",
  },
};

export const ADDON_TEMPLATE_DATADOG: AddonTemplate<"datadog"> = {
  type: "datadog",
  displayName: "DataDog",
  description:
    "Pipe logs, metrics and APM data from your workloads to DataDog.",
  icon: "https://datadog-live.imgix.net/img/dd_logo_70x75.png",
  tags: ["Monitoring"],
  tabs: [
    {
      name: "configuration",
      displayName: "Configuration",
      component: DatadogForm,
    },
    {
      name: "logs",
      displayName: "Logs",
      component: Logs,
      isOnlyForPorterOperators: true,
    },
    {
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
  defaultValues: {
    type: "datadog",
    cpuCores: 0.5,
    ramMegabytes: 512,
    site: "datadoghq.com",
    apiKey: "",
    loggingEnabled: false,
    apmEnabled: false,
    dogstatsdEnabled: false,
  },
};

export const ADDON_TEMPLATE_MEZMO: AddonTemplate<"mezmo"> = {
  type: "mezmo",
  displayName: "Mezmo",
  description: "A popular logging management system.",
  icon: "https://media.licdn.com/dms/image/D560BAQEDU9GQqUZHsQ/company-logo_200_200/0/1664831631499/mezmo_logo?e=2147483647&v=beta&t=h-mCuJh3FSVhXKvvGcfFrL6w9LPaCexypRcw2QWboEs",
  tags: ["Logging"],
  tabs: [
    {
      name: "configuration",
      displayName: "Configuration",
      component: MezmoForm,
    },
    {
      name: "logs",
      displayName: "Logs",
      component: Logs,
      isOnlyForPorterOperators: true,
    },
    {
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
  defaultValues: {
    type: "mezmo",
    ingestionKey: "",
  },
};

export const ADDON_TEMPLATE_METABASE: AddonTemplate<"metabase"> = {
  type: "metabase",
  displayName: "Metabase",
  description: "An open-source business intelligence tool.",
  icon: "https://pbs.twimg.com/profile_images/961380992727465985/4unoiuHt.jpg",
  tags: ["Analytics"],
  tabs: [
    {
      name: "configuration",
      displayName: "Configuration",
      component: MetabaseForm,
    },
    {
      name: "logs",
      displayName: "Logs",
      component: Logs,
    },
    {
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
  defaultValues: {
    type: "metabase",
    exposedToExternalTraffic: true,
    porterDomain: "",
    customDomain: "",
    datastore: {
      host: "",
      port: 0,
      databaseName: "",
      username: "",
      password: "",
    },
  },
};

export const ADDON_TEMPLATE_NEWRELIC: AddonTemplate<"newrelic"> = {
  type: "newrelic",
  displayName: "New Relic",
  description: "Monitor your applications and infrastructure.",
  icon: "https://companieslogo.com/img/orig/NEWR-de5fcb2e.png?t=1681801483",
  tags: ["Monitoring"],
  tabs: [
    {
      name: "configuration",
      displayName: "Configuration",
      component: NewRelicForm,
    },
    {
      name: "logs",
      displayName: "Logs",
      component: Logs,
      isOnlyForPorterOperators: true,
    },
    {
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
  defaultValues: {
    type: "newrelic",
    licenseKey: "",
    insightsKey: "",
    personalApiKey: "",
    accountId: "",
    loggingEnabled: false,
    kubeEventsEnabled: false,
    metricsAdapterEnabled: false,
    prometheusEnabled: false,
    pixieEnabled: false,
  },
};

export const ADDON_TEMPLATE_TAILSCALE: AddonTemplate<"tailscale"> = {
  type: "tailscale",
  displayName: "Tailscale",
  description: "A VPN for your applications and datastores.",
  icon: "https://play-lh.googleusercontent.com/wczDL05-AOb39FcL58L32h6j_TrzzGTXDLlOrOmJ-aNsnoGsT1Gkk2vU4qyTb7tGxRw=w240-h480-rw",
  tags: ["Networking"],
  tabs: [
    {
      name: "overview",
      displayName: "Overview",
      component: TailscaleOverview,
    },
    {
      name: "configuration",
      displayName: "Configuration",
      component: TailscaleForm,
    },
    {
      name: "logs",
      displayName: "Logs",
      component: Logs,
      isOnlyForPorterOperators: true,
    },
    {
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
  defaultValues: {
    type: "tailscale",
    authKey: "",
    subnetRoutes: [],
  },
};

export const ADDON_TEMPLATE_QUIVR: AddonTemplate<"quivr"> = {
  type: "quivr",
  displayName: "Quivr",
  description: "Your second brain, empowered by generative AI",
  icon: quivr,
  tags: ["Analytics"],
  tabs: [
    {
      name: "configuration",
      displayName: "Configuration",
      component: QuivrForm,
    },
    {
      name: "logs",
      displayName: "Logs",
      component: Logs,
      isOnlyForPorterOperators: true,
    },
    {
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
  defaultValues: {
    type: "quivr",
    exposedToExternalTraffic: true,
    porterDomain: "",
    customDomain: "",
    openAiApiKey: "",
    supabaseUrl: "",
    supabaseServiceKey: "",
    pgDatabaseUrl: "",
    jwtSecretKey: "",
    quivrDomain: "https://chat.quivr.com",
    anthropicApiKey: "",
    cohereApiKey: "",
  },
};

export const SUPPORTED_ADDON_TEMPLATES: Array<AddonTemplate<ClientAddonType>> =
  [
    ADDON_TEMPLATE_DATADOG,
    ADDON_TEMPLATE_MEZMO,
    ADDON_TEMPLATE_METABASE,
    // ADDON_TEMPLATE_NEWRELIC,
    ADDON_TEMPLATE_TAILSCALE,
    ADDON_TEMPLATE_QUIVR,
  ];
