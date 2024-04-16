import { z } from "zod";

export const tailscaleConfigValidator = z.object({
  type: z.literal("tailscale"),
  authKey: z.string().nonempty().default("*******"),
  subnetRoutes: z.array(z.string()).default([]),
});
export type TailscaleConfigValidator = z.infer<typeof tailscaleConfigValidator>;
