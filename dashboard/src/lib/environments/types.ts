import { z } from "zod";

import { clientAddonValidator } from "lib/addons";
import { clientAppValidator } from "lib/porter-apps";

const environmentValidator = z.object({
  name: z.string(),
  apps: z.array(clientAppValidator),
  addons: z.array(clientAddonValidator),
});

export type Environment = z.infer<typeof environmentValidator>;
