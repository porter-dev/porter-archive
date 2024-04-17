import { z } from "zod";

const subnetRouteValidator = z.object({
  route: z.string(),
});
export const tailscaleConfigValidator = z.object({
  type: z.literal("tailscale"),
  authKey: z.string().nonempty().default("*******"),
  subnetRoutes: z.array(subnetRouteValidator).default([]),
});
export type TailscaleConfigValidator = z.infer<typeof tailscaleConfigValidator>;
