import { z } from "zod";

const artifactValidator = z.object({
    tag: z.string(),
    updated_at: z.string(),
})
export type ArtifactType = z.infer<typeof artifactValidator>;

export const imageValidator = z.object({
    uri: z.string(),
    artifacts: z.array(artifactValidator),
})
export type ImageType = z.infer<typeof imageValidator>;