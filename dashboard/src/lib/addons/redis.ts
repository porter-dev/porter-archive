import { z } from "zod";

import { serviceNumberValidator } from "lib/porter-apps/values";

export const redisConfigValidator = z.object({
  type: z.literal("redis"),
  cpuCores: serviceNumberValidator.default({
    value: 0.5,
    readOnly: false,
  }),
  ramMegabytes: serviceNumberValidator.default({
    value: 512,
    readOnly: false,
  }),
  storageGigabytes: serviceNumberValidator.default({
    value: 1,
    readOnly: false,
  }),
  password: z.string().default("redis"),
});
export type RedisConfig = z.infer<typeof redisConfigValidator>;

export function defaultRedisAddon(): RedisConfig {
  return redisConfigValidator.parse({
    type: "redis",
  });
}
