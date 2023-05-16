import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import * as z from "zod";
import { JobService, ReleaseService, Service, WebService, WorkerService } from "./serviceTypes";
import { overrideObjectValues } from "./utils";

const appConfigSchema = z.object({
    run: z.string().min(1),
    config: z.any().optional(),
    type: z.enum(['web', 'worker', 'job']).optional(),
});

export const AppsSchema = z.record(appConfigSchema);

export const EnvSchema = z.record(z.string());

export const BuildSchema = z.object({
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
},
    { message: "Invalid build configuration" });


export const PorterYamlSchema = z.object({
    version: z.string().optional(),
    build: BuildSchema.optional(),
    env: EnvSchema.optional(),
    apps: AppsSchema,
    release: appConfigSchema.optional(),
});

export const createFinalPorterYaml = (
    services: Service[],
    releaseJob: Service[],
    dashboardSetEnvVariables: KeyValueType[],
    porterJson: PorterJson | undefined,
    injectPortEnvVariable: boolean = false,
): PorterJson => {
    const [apps, port] = createApps(services.filter(Service.isNonRelease), porterJson, injectPortEnvVariable);
    const env = combineEnv(dashboardSetEnvVariables, porterJson?.env);

    // inject a port env variable if necessary
    if (port != null) {
        env.PORT = port;
    }

    return {
        version: "v1stack",
        env,
        apps,
        release: createRelease(releaseJob.find(Service.isRelease)),
    };
};

const combineEnv = (
    dashboardSetVariables: KeyValueType[],
    porterYamlSetVariables: Record<string, string> | undefined
): z.infer<typeof EnvSchema> => {
    const env: z.infer<typeof EnvSchema> = {};
    for (const { key, value } of dashboardSetVariables) {
        env[key] = value;
    }
    if (porterYamlSetVariables != null) {
        for (const [key, value] of Object.entries(porterYamlSetVariables)) {
            env[key] = value;
        }
    }
    return env;
};

const createApps = (
    serviceList: (WorkerService | WebService | JobService)[],
    porterJson: PorterJson | undefined,
    injectPortEnvVariable: boolean,
): [z.infer<typeof AppsSchema>, string | undefined] => {
    const apps: z.infer<typeof AppsSchema> = {};
    let port: string | undefined = undefined;
    for (const service of serviceList) {
        let config = Service.serialize(service);

        if (
            porterJson != null &&
            porterJson.apps != null &&
            porterJson.apps[service.name] != null &&
            porterJson.apps[service.name].config != null
        ) {
            config = overrideObjectValues(
                config,
                porterJson.apps[service.name].config
            );
        }

        if (injectPortEnvVariable && service.type === "web") {
            port = service.port.value;
        }

        apps[service.name] = {
            type: service.type,
            run: service.startCommand.value,
            config,
        };
    }

    return [apps, port];
};

const createRelease = (
    release: ReleaseService | undefined,
): z.infer<typeof appConfigSchema> => {
    if (release == null) {
        return {};
    }
    return {
        type: 'job',
        run: release.startCommand.value,
        config: Service.serialize(release),
    }
}

export type PorterJson = z.infer<typeof PorterYamlSchema>;
