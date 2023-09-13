import { appRevisionValidator } from "lib/revisions/types";
import { z } from "zod";
import { porterAppValidator } from "../app-view/AppView";

export const appRevisionWithSourceValidator = z.object({
  app_revision: appRevisionValidator,
  source: porterAppValidator,
});

export type AppRevisionWithSource = z.infer<
  typeof appRevisionWithSourceValidator
>;
