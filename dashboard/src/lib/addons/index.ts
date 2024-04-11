import {
  Addon,
  AddonType,
} from "@porter-dev/api-contracts/src/porter/v1/addons_pb";
import { match } from "ts-pattern";
import { z } from "zod";

import { serviceStringValidator } from "lib/porter-apps/values";

import { datadogConfigValidator } from "./datadog";
import { defaultPostgresAddon, postgresConfigValidator } from "./postgres";
import { redisConfigValidator } from "./redis";
import {
  ADDON_TEMPLATE_DATADOG,
  ADDON_TEMPLATE_POSTGRES,
  ADDON_TEMPLATE_REDIS,
  type AddonTemplate,
} from "./template";

export const clientAddonValidator = z.object({
  expanded: z.boolean().default(false),
  canDelete: z.boolean().default(true),
  name: z.object({
    readOnly: z.boolean().default(false),
    value: z
      .string()
      .min(1, { message: "Name must be at least 1 character" })
      .max(31, { message: "Name must be 31 characters or less" })
      .regex(/^[a-z0-9-]{1,61}$/, {
        message: 'Lowercase letters, numbers, and "-" only.',
      }),
  }),
  envGroups: z.array(serviceStringValidator).default([]),
  config: z.discriminatedUnion("type", [
    postgresConfigValidator,
    redisConfigValidator,
    datadogConfigValidator,
  ]),
});
export type ClientAddon = z.infer<typeof clientAddonValidator> & {
  template: AddonTemplate;
};
export type ClientDatadogAddon = ClientAddon & {
  config: z.infer<typeof datadogConfigValidator>;
};

export function defaultClientAddon(
  type: ClientAddon["config"]["type"]
): ClientAddon {
  return match(type)
    .with("postgres", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "postgres" },
        config: defaultPostgresAddon(),
      }),
      template: ADDON_TEMPLATE_POSTGRES,
    }))
    .with("redis", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "redis" },
        config: redisConfigValidator.parse({
          type: "redis",
        }),
      }),
      template: ADDON_TEMPLATE_REDIS,
    }))
    .with("datadog", () => ({
      ...clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "datadog" },
        config: datadogConfigValidator.parse({
          type: "datadog",
        }),
      }),
      template: ADDON_TEMPLATE_DATADOG,
    }))
    .exhaustive();
}

function addonTypeEnumProto(type: ClientAddon["config"]["type"]): AddonType {
  return match(type)
    .with("postgres", () => AddonType.POSTGRES)
    .with("redis", () => AddonType.REDIS)
    .with("datadog", () => AddonType.DATADOG)
    .exhaustive();
}

export function clientAddonToProto(addon: ClientAddon): Addon {
  const config = match(addon.config)
    .with({ type: "postgres" }, (data) => ({
      value: {
        cpuCores: data.cpuCores.value,
        ramMegabytes: data.ramMegabytes.value,
        storageGigabytes: data.storageGigabytes.value,
      },
      case: "postgres" as const,
    }))
    .with({ type: "redis" }, (data) => ({
      value: {
        cpuCores: data.cpuCores.value,
        ramMegabytes: data.ramMegabytes.value,
        storageGigabytes: data.storageGigabytes.value,
      },
      case: "redis" as const,
    }))
    .with({ type: "datadog" }, (data) => ({
      value: {
        cpuCores: data.cpuCores,
        ramMegabytes: data.ramMegabytes,
        site: data.site,
        apiKey: data.apiKey,
        loggingEnabled: data.loggingEnabled,
        apmEnabled: data.apmEnabled,
        dogstatsdEnabled: data.dogstatsdEnabled,
      },
      case: "datadog" as const,
    }))
    .exhaustive();

  const proto = new Addon({
    name: addon.name.value,
    type: addonTypeEnumProto(addon.config.type),
    envGroups: addon.envGroups.map((envGroup) => ({
      name: envGroup.value,
    })),
    config,
  });

  return proto;
}

export function clientAddonFromProto({
  addon,
  variables = {},
  secrets = {},
}: {
  addon: Addon;
  variables?: Record<string, string>;
  secrets?: Record<string, string>;
}): ClientAddon {
  if (!addon.config.case) {
    throw new Error("Addon type is unspecified");
  }

  const config = match(addon.config)
    .with({ case: "postgres" }, (data) => ({
      type: "postgres" as const,
      cpuCores: {
        readOnly: false,
        value: data.value.cpuCores,
      },
      ramMegabytes: {
        readOnly: false,
        value: data.value.ramMegabytes,
      },
      storageGigabytes: {
        readOnly: false,
        value: data.value.storageGigabytes,
      },
      username: variables.POSTGRESQL_USERNAME,
      password: secrets.POSTGRESQL_PASSWORD,
    }))
    .with({ case: "redis" }, (data) => ({
      type: "redis" as const,
      cpuCores: {
        readOnly: false,
        value: data.value.cpuCores,
      },
      ramMegabytes: {
        readOnly: false,
        value: data.value.ramMegabytes,
      },
      storageGigabytes: {
        readOnly: false,
        value: data.value.storageGigabytes,
      },
      password: secrets.REDIS_PASSWORD,
    }))
    .with({ case: "datadog" }, (data) => ({
      type: "datadog" as const,
      cpuCores: data.value.cpuCores,
      ramMegabytes: data.value.ramMegabytes,
      site: data.value.site,
      apiKey: data.value.apiKey,
      loggingEnabled: data.value.loggingEnabled,
      apmEnabled: data.value.apmEnabled,
      dogstatsdEnabled: data.value.dogstatsdEnabled,
    }))
    .exhaustive();

  const template = match(addon.config)
    .with({ case: "postgres" }, () => ADDON_TEMPLATE_POSTGRES)
    .with({ case: "redis" }, () => ADDON_TEMPLATE_REDIS)
    .with({ case: "datadog" }, () => ADDON_TEMPLATE_DATADOG)
    .exhaustive();

  const clientAddon = {
    ...clientAddonValidator.parse({
      name: { readOnly: false, value: addon.name },
      envGroups: addon.envGroups.map((envGroup) => ({
        value: envGroup.name,
      })),
      config,
    }),
    template,
  };

  return clientAddon;
}
