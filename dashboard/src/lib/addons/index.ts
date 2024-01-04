import {
  Addon,
  AddonType,
} from "@porter-dev/api-contracts/src/porter/v1/addons_pb";
import { match } from "ts-pattern";
import { z } from "zod";

import { serviceStringValidator } from "lib/porter-apps/values";

import { defaultPostgresAddon, postgresConfigValidator } from "./postgres";
import { redisConfigValidator } from "./redis";

export const clientAddonValidator = z.object({
  expanded: z.boolean().default(false),
  canDelete: z.boolean().default(true),
  name: z.object({
    readOnly: z.boolean(),
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
  ]),
});
export type ClientAddon = z.infer<typeof clientAddonValidator>;

export function defaultClientAddon(
  type: ClientAddon["config"]["type"]
): ClientAddon {
  return match(type)
    .with("postgres", () =>
      clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "addon" },
        config: defaultPostgresAddon(),
      })
    )
    .with("redis", () =>
      clientAddonValidator.parse({
        expanded: true,
        name: { readOnly: false, value: "addon" },
        config: redisConfigValidator.parse({
          type: "redis",
        }),
      })
    )
    .exhaustive();
}

function addonTypeEnumProto(type: ClientAddon["config"]["type"]): AddonType {
  return match(type)
    .with("postgres", () => AddonType.POSTGRES)
    .with("redis", () => AddonType.REDIS)
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
    .exhaustive();

  const clientAddon = clientAddonValidator.parse({
    name: { readOnly: false, value: addon.name },
    envGroups: addon.envGroups.map((envGroup) => ({
      value: envGroup.name,
    })),
    config,
  });

  return clientAddon;
}
