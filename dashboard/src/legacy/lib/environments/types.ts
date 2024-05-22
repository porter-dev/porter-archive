import { clientAddonValidator } from "legacy/lib/addons";
import { clientAppValidator } from "legacy/lib/porter-apps";
import { z } from "zod";

const environmentValidator = z.object({
  name: z.string(),
  apps: z.array(clientAppValidator),
  addons: z.array(clientAddonValidator),
});

export type Environment = z.infer<typeof environmentValidator>;
