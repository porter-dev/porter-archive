import Settings from "main/home/add-on-dashboard/common/Settings";
import DatadogForm from "main/home/add-on-dashboard/datadog/DatadogForm";
import MetabaseForm from "main/home/add-on-dashboard/metabase/MetabaseForm";
import MezmoForm from "main/home/add-on-dashboard/mezmo/MezmoForm";
import NewRelicForm from "main/home/add-on-dashboard/newrelic/NewRelicForm";
import TailscaleForm from "main/home/add-on-dashboard/tailscale/TailscaleForm";
import TailscaleOverview from "main/home/add-on-dashboard/tailscale/TailscaleOverview";

import { type ClientAddon } from ".";

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
};

export const DEFAULT_ADDON_TAB = {
  name: "configuration",
  displayName: "Configuration",
  component: () => null,
};

export type AddonTemplate = {
  type: ClientAddon["config"]["type"];
  displayName: string;
  description: string;
  icon: string;
  tags: AddonTemplateTag[];
  tabs: AddonTab[]; // this what is rendered on the dashboard after the addon is deployed
};

export const ADDON_TEMPLATE_REDIS: AddonTemplate = {
  type: "redis",
  displayName: "Redis",
  description: "An in-memory database that persists on disk.",
  icon: "https://cdn4.iconfinder.com/data/icons/redis-2/1451/Untitled-2-512.png",
  tags: ["Database"],
  tabs: [],
};

export const ADDON_TEMPLATE_POSTGRES: AddonTemplate = {
  type: "postgres",
  displayName: "Postgres",
  description: "An object-relational database system.",
  icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",
  tags: ["Database"],
  tabs: [],
};

export const ADDON_TEMPLATE_DATADOG: AddonTemplate = {
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
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
};

export const ADDON_TEMPLATE_MEZMO: AddonTemplate = {
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
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
};

export const ADDON_TEMPLATE_METABASE: AddonTemplate = {
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
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
};

export const ADDON_TEMPLATE_NEWRELIC: AddonTemplate = {
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
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
};

export const ADDON_TEMPLATE_TAILSCALE: AddonTemplate = {
  type: "tailscale",
  displayName: "Tailscale",
  description: "A secure network for teams.",
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
      name: "settings",
      displayName: "Settings",
      component: Settings,
    },
  ],
};

export const SUPPORTED_ADDON_TEMPLATES: AddonTemplate[] = [
  ADDON_TEMPLATE_DATADOG,
  ADDON_TEMPLATE_MEZMO,
  ADDON_TEMPLATE_METABASE,
  ADDON_TEMPLATE_NEWRELIC,
  ADDON_TEMPLATE_TAILSCALE,
];
