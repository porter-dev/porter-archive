import { appRevisionValidator } from "legacy/lib/revisions/types";
import { z } from "zod";

import { porterAppValidator } from "../app-view/AppView";

export const appRevisionWithSourceValidator = z.object({
  app_revision: appRevisionValidator,
  source: porterAppValidator,
});

export type AppRevisionWithSource = z.infer<
  typeof appRevisionWithSourceValidator
>;

export const appInstanceValidator = z.object({
  id: z.string(),
  name: z.string(),
  deployment_target: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
  }),
});

export type AppInstance = z.infer<typeof appInstanceValidator>;
