import { z } from "zod";

export const mezmoConfigValidator = z.object({
  type: z.literal("mezmo"),
  ingestionKey: z.string().nonempty().default("*******"),
});
export type MezmoConfigValidator = z.infer<typeof mezmoConfigValidator>;
