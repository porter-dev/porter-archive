import * as z from "zod";

const appConfigSchema = z.object({
    run: z.string().min(1),
    config: z.any().optional(),
    type: z.enum(['web', 'worker', 'job']).optional(),
});

const appsSchema = z.record(appConfigSchema);

const envSchema = z.record(z.string());

const buildSchema = z.object({
    method: z.string().refine(value => ["pack", "docker", "registry"].includes(value)),
    context: z.string().optional(),
    builder: z.string().optional(),
    buildpacks: z.array(z.string()).optional(),
    dockerfile: z.string().optional(),
    image: z.string().optional()
}).refine(value => {
    if (value.method === "pack") {
        return value.builder != null;
    }
    if (value.method === "docker") {
        return value.dockerfile != null;
    }
    if (value.method === "registry") {
        return value.image != null;
    }
    return false;
}, { message: "Invalid build configuration" });


export const PorterYamlSchema = z.object({
    version: z.string().optional(),
    build: buildSchema,
    env: envSchema,
    apps: appsSchema,
    release: z.string().optional(),
});
