import {
  Addon,
  AddonType,
} from "@porter-dev/api-contracts/src/porter/v1/addons_pb";
import { match } from "ts-pattern";
import { z } from "zod";

import { serviceStringValidator } from "lib/porter-apps/values";

import { defaultPostgresAddon, postgresConfigValidator } from "./postgres";

export const clientAddonValidator = z.object({
  expanded: z.boolean().default(true),
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
  config: z.discriminatedUnion("type", [postgresConfigValidator]),
});
export type ClientAddon = z.infer<typeof clientAddonValidator>;

export function defaultClientAddon(): ClientAddon {
  return clientAddonValidator.parse({
    name: { readOnly: false, value: "addon" },
    config: defaultPostgresAddon(),
  });
}

function addonTypeEnumProto(type: ClientAddon["config"]["type"]): AddonType {
  return match(type)
    .with("postgres", () => AddonType.POSTGRES)
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
