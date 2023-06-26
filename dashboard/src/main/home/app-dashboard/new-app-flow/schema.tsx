import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import * as z from "zod";
import { JobService, ReleaseService, Service, WebService, WorkerService } from "./serviceTypes";
import { overrideObjectValues } from "./utils";
import _ from "lodash";
import { PopulatedEnvGroup } from "../../../../components/porter-form/types";

const appConfigSchema = z.object({
    run: z.string().min(1),
    config: z.any().optional(),
    type: z.enum(['web', 'worker', 'job']).optional(),
});

export const AppsSchema = z.record(appConfigSchema);

export const EnvSchema = z.record(z.string());
export const PopulatedEnvGroupSchema = z.record(z.object({
    name: z.string(),
    namespace: z.string(),
    version: z.number(),
    variables: z.record(z.string()),
    applications: z.array(z.any()),
    meta_version: z.number(),
    stack_id: z.string().optional(),
}));

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
    syncedEnv: PopulatedEnvGroupSchema.optional(),
    apps: AppsSchema,
    release: appConfigSchema.optional(),
});

export const createFinalPorterYaml = (
    services: Service[],
    dashboardSetEnvVariables: KeyValueType[],
    syncedEnvGroup: PopulatedEnvGroup[],
    porterJson: PorterJson | undefined,
    injectPortEnvVariable: boolean = false,
): PorterJson => {
    porterJson?.syncedEnv
    const [apps, port] = createApps(services.filter(Service.isNonRelease), porterJson, injectPortEnvVariable);
    const env = combineEnv(dashboardSetEnvVariables, porterJson?.env);
    const syncedEnv = syncedEnvGroup;

    // inject a port env variable if necessary
    console.log(env)
    if (port != null) {
        env.PORT = port;
    }

    const release = services.find(Service.isRelease);

    return release != null && !_.isEmpty(release.startCommand.value) ? {
        version: "v1stack",
        env,

        apps,
        release: createRelease(release, porterJson),
    } : {
        version: "v1stack",
        env,
        apps,
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

const combineSyncedEnv = (
    syncedEnvGroups: PopulatedEnvGroup[],
    porterYamlSyncedEnv: Record<string, z.infer<typeof PopulatedEnvGroupSchema>> | undefined
): Record<string, z.infer<typeof PopulatedEnvGroupSchema>> => {
    const syncedEnv: Record<string, z.infer<typeof PopulatedEnvGroupSchema>> = {};

    // Parse each PopulatedEnvGroup into the schema type
    for (const group of syncedEnvGroups) {
        syncedEnv[group.name] = PopulatedEnvGroupSchema.parse(group);
    }

    // Merge the syncedEnv from porterJson if it exists
    if (porterYamlSyncedEnv != null) {
        for (const [key, value] of Object.entries(porterYamlSyncedEnv)) {
            syncedEnv[key] = value;
        }
    }

    return syncedEnv;
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

const createRelease = (release: ReleaseService, porterJson: PorterJson | undefined): z.infer<typeof appConfigSchema> => {
    let config = Service.serialize(release);

    if (porterJson?.release?.config != null) {
        config = overrideObjectValues(
            config,
            porterJson.release.config
        );
    }

    return {
        type: 'job',
        run: release.startCommand.value,
        config,
    }
}

export type PorterJson = z.infer<typeof PorterYamlSchema>;
