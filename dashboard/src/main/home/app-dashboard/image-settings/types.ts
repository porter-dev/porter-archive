import { z } from "zod";

export const imageValidator = z.object({
    uri: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    registry_id: z.number(),
})
export type ImageType = z.infer<typeof imageValidator>;

export const tagValidator = z.object({ tag: z.string(), pushed_at: z.string() })
export type TagType = z.infer<typeof tagValidator>;