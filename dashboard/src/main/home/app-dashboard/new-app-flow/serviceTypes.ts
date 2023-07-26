import _ from "lodash";
import { overrideObjectValues } from "./utils";
import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { PorterJson } from "./schema";
import { z } from "zod";

const serviceStringValidator = z.object({
    readOnly: z.boolean(),
    value: z.string(),
});
export type ServiceString = z.infer<typeof serviceStringValidator>;

const serviceBooleanValidator = z.object({
    readOnly: z.boolean(),
    value: z.boolean(),
});
export type ServiceBoolean = z.infer<typeof serviceBooleanValidator>;

const serviceArrayValidator = z.array(
    z.object({
        key: z.string(),
        value: serviceStringValidator,
    })
);
export type ServiceArray = z.infer<typeof serviceArrayValidator>;

const serviceIngressValidator = z.object({
    enabled: serviceBooleanValidator,
    customDomain: serviceStringValidator,
    hosts: serviceStringValidator,
    porterHosts: serviceStringValidator,
    annotations: serviceArrayValidator,
});
export type Ingress = z.infer<typeof serviceIngressValidator>;

const serviceAutoscalingValidator = z.object({
    enabled: serviceBooleanValidator,
    minReplicas: serviceStringValidator,
    maxReplicas: serviceStringValidator,
    targetCPUUtilizationPercentage: serviceStringValidator,
    targetMemoryUtilizationPercentage: serviceStringValidator,
});
export type Autoscaling = z.infer<typeof serviceAutoscalingValidator>;

const serviceLivenessProbeValidator = z.object({
    enabled: serviceBooleanValidator,
    failureThreshold: serviceStringValidator,
    path: serviceStringValidator,
    periodSeconds: serviceStringValidator,
});
export type LivenessProbe = z.infer<typeof serviceLivenessProbeValidator>;

const serviceReadinessProbeValidator = z.object({
    enabled: serviceBooleanValidator,
    failureThreshold: serviceStringValidator,
    path: serviceStringValidator,
    initialDelaySeconds: serviceStringValidator,
});
export type ReadinessProbe = z.infer<typeof serviceReadinessProbeValidator>;

const serviceStartupProbeValidator = z.object({
    enabled: serviceBooleanValidator,
    failureThreshold: serviceStringValidator,
    path: serviceStringValidator,
    periodSeconds: serviceStringValidator,
});
export type StartUpProbe = z.infer<typeof serviceStartupProbeValidator>;

const serviceHealthValidator = z.object({
    livenessProbe: serviceLivenessProbeValidator,
    startupProbe: serviceStartupProbeValidator,
    readinessProbe: serviceReadinessProbeValidator,
});
export type Health = z.infer<typeof serviceHealthValidator>;

const serviceCloudSqlValidator = z.object({
    enabled: serviceBooleanValidator,
    connectionName: serviceStringValidator,
    dbPort: serviceStringValidator,
    serviceAccountJSON: serviceStringValidator,
});
export type CloudSql = z.infer<typeof serviceCloudSqlValidator>;

export const serviceTypeValidator = z.enum(["web", "worker", "job", "release"]);
export type ServiceType = z.infer<typeof serviceTypeValidator>;

const sharedServiceParamsValidator = z.object({
    name: z.string(),
    cpu: serviceStringValidator,
    ram: serviceStringValidator,
    startCommand: serviceStringValidator,
    type: serviceTypeValidator,
    canDelete: z.boolean(),
    cloudsql: serviceCloudSqlValidator,
});
export type SharedServiceParams = z.infer<typeof sharedServiceParamsValidator>;

const workerServiceValidator = sharedServiceParamsValidator.extend({
    type: z.literal("worker"),
    replicas: serviceStringValidator,
    autoscaling: serviceAutoscalingValidator,
});
export type WorkerService = z.infer<typeof workerServiceValidator>;

const webServiceValidator = sharedServiceParamsValidator.extend({
    type: z.literal("web"),
    replicas: serviceStringValidator,
    autoscaling: serviceAutoscalingValidator,
    port: serviceStringValidator,
    ingress: serviceIngressValidator,
    health: serviceHealthValidator,
});
export type WebService = z.infer<typeof webServiceValidator>;

const jobServiceValidator = sharedServiceParamsValidator.extend({
    type: z.literal("job"),
    jobsExecuteConcurrently: serviceBooleanValidator,
    cronSchedule: serviceStringValidator,
});
export type JobService = z.infer<typeof jobServiceValidator>;

const releaseServiceValidator = sharedServiceParamsValidator.extend({
    type: z.literal("release"),
});
export type ReleaseService = z.infer<typeof releaseServiceValidator>;

export const serviceValidator = z.discriminatedUnion("type", [
    webServiceValidator,
    workerServiceValidator,
    jobServiceValidator,
    releaseServiceValidator,
]);
export type Service = z.infer<typeof serviceValidator>;

const ServiceArray = {
    serialize: (serviceArray: ServiceArray) => {
        const map: Record<string, string> = {};
        serviceArray.map(({ key, value }) => {
            if (key != "") {
                map[key] = value.value.toString();
            }
        });
        return map;
    },
};

const ServiceField = {
    string: (defaultValue: string, overrideValue?: string): ServiceString => {
        return {
            readOnly: overrideValue != null,
            value: overrideValue ?? defaultValue,
        };
    },
    boolean: (
        defaultValue: boolean,
        overrideValue?: boolean
    ): ServiceBoolean => {
        return {
            readOnly: overrideValue != null,
            value: overrideValue ?? defaultValue,
        };
    },
    array: (
        defaultMap: Record<string, string>,
        overrideMap?: Record<string, string>
    ) => {
        const serviceMap: Record<string, ServiceString> = {};
        for (const key in defaultMap) {
            serviceMap[key] = ServiceField.string(defaultMap[key]);
        }
        for (const key in overrideMap) {
            serviceMap[key] = ServiceField.string("", overrideMap[key]);
        }
        if (Object.keys(serviceMap).length == 0) {
            return [];
        }
        return Object.keys(serviceMap).map((key) => ({
            key,
            value: serviceMap[key],
        }));
    },
};

const WebService = {
    default: (name: string, porterJson?: PorterJson): WebService => ({
        name,
        cpu: ServiceField.string(
            "100",
            porterJson?.apps?.[name]?.config?.resources?.requests?.cpu
                ? porterJson?.apps?.[
                      name
                  ]?.config?.resources?.requests?.cpu.replace("m", "")
                : undefined
        ),
        ram: ServiceField.string(
            "256",
            porterJson?.apps?.[name]?.config?.resources?.requests?.memory
                ? porterJson?.apps?.[
                      name
                  ]?.config?.resources?.requests?.memory.replace("Mi", "")
                : undefined
        ),
        startCommand: ServiceField.string("", porterJson?.apps?.[name]?.run),
        type: "web",
        replicas: ServiceField.string(
            "1",
            porterJson?.apps?.[name]?.config?.replicaCount
        ),
        autoscaling: {
            enabled: ServiceField.boolean(
                false,
                porterJson?.apps?.[name]?.config?.autoscaling?.enabled
            ),
            minReplicas: ServiceField.string(
                "1",
                porterJson?.apps?.[name]?.config?.autoscaling?.minReplicas
            ),
            maxReplicas: ServiceField.string(
                "10",
                porterJson?.apps?.[name]?.config?.autoscaling?.maxReplicas
            ),
            targetCPUUtilizationPercentage: ServiceField.string(
                "50",
                porterJson?.apps?.[name]?.config?.autoscaling
                    ?.targetCPUUtilizationPercentage
            ),
            targetMemoryUtilizationPercentage: ServiceField.string(
                "50",
                porterJson?.apps?.[name]?.config?.autoscaling
                    ?.targetMemoryUtilizationPercentage
            ),
        },
        ingress: {
            enabled: ServiceField.boolean(
                true,
                porterJson?.apps?.[name]?.config?.ingress?.enabled
            ),
            customDomain: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.ingress?.hosts?.length
                    ? porterJson?.apps?.[name]?.config?.ingress?.hosts[0]
                    : undefined
            ),
            hosts: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.ingress?.hosts?.length
                    ? porterJson?.apps?.[name]?.config?.ingress?.hosts[0]
                    : undefined
            ),
            porterHosts: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.ingress?.porter_hosts?.length
                    ? porterJson?.apps?.[name]?.config?.ingress?.porter_hosts[0]
                    : undefined
            ),
            annotations: ServiceField.array(
                {},
                porterJson?.apps?.[name]?.config?.ingress?.annotations
            ),
        },
        port: ServiceField.string(
            "3000",
            porterJson?.apps?.[name]?.config?.container?.port
        ),
        canDelete: porterJson?.apps?.[name] == null,
        health: {
            startupProbe: {
                enabled: ServiceField.boolean(
                    false,
                    porterJson?.apps?.[name]?.config?.health?.startupProbe
                        ?.enabled
                ),
                failureThreshold: ServiceField.string(
                    "3",
                    porterJson?.apps?.[name]?.config?.health?.startupProbe
                        ?.failureThreshold
                ),
                path: ServiceField.string(
                    "/startupz",
                    porterJson?.apps?.[name]?.config?.health?.startupProbe?.path
                ),
                periodSeconds: ServiceField.string(
                    "5",
                    porterJson?.apps?.[name]?.config?.health?.startupProbe
                        ?.periodSeconds
                ),
            },
            readinessProbe: {
                enabled: ServiceField.boolean(
                    false,
                    porterJson?.apps?.[name]?.config?.health?.readinessProbe
                        ?.enabled
                ),
                failureThreshold: ServiceField.string(
                    "3",
                    porterJson?.apps?.[name]?.config?.health?.readinessProbe
                        ?.failureThreshold
                ),
                path: ServiceField.string(
                    "/readyz",
                    porterJson?.apps?.[name]?.config?.health?.readinessProbe
                        ?.path
                ),
                initialDelaySeconds: ServiceField.string(
                    "0",
                    porterJson?.apps?.[name]?.config?.health?.readinessProbe
                        ?.initialDelaySeconds
                ),
            },
            livenessProbe: {
                enabled: ServiceField.boolean(
                    false,
                    porterJson?.apps?.[name]?.config?.health?.livenessProbe
                        ?.enabled
                ),
                failureThreshold: ServiceField.string(
                    "3",
                    porterJson?.apps?.[name]?.config?.health?.livenessProbe
                        ?.failureThreshold
                ),
                path: ServiceField.string(
                    "/livez",
                    porterJson?.apps?.[name]?.config?.health?.livenessProbe
                        ?.path
                ),
                periodSeconds: ServiceField.string(
                    "5",
                    porterJson?.apps?.[name]?.config?.health?.livenessProbe
                        ?.periodSeconds
                ),
            },
        },
        cloudsql: {
            enabled: ServiceField.boolean(
                false,
                porterJson?.apps?.[name]?.config?.cloudsql?.enabled
            ),
            connectionName: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.cloudsql?.connectionName
            ),
            dbPort: ServiceField.string(
                "5432",
                porterJson?.apps?.[name]?.config?.cloudsql?.dbPort
            ),
            serviceAccountJSON: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.cloudsql?.serviceAccountJSON
            ),
        },
    }),
    serialize: (service: WebService) => {
        return {
            replicaCount: service.replicas.value,
            resources: {
                requests: {
                    cpu: service.cpu.value + "m",
                    memory: service.ram.value + "Mi",
                },
            },
            container: {
                command: service.startCommand.value,
                port: service.port.value,
            },
            autoscaling: {
                enabled: service.autoscaling.enabled.value,
                minReplicas: service.autoscaling.minReplicas.value,
                maxReplicas: service.autoscaling.maxReplicas.value,
                targetCPUUtilizationPercentage:
                    service.autoscaling.targetCPUUtilizationPercentage.value,
                targetMemoryUtilizationPercentage:
                    service.autoscaling.targetMemoryUtilizationPercentage.value,
            },
            ingress: {
                enabled: service.ingress.enabled.value,
                custom_domain: service.ingress.customDomain.value
                    ? true
                    : false,
                hosts: service.ingress.customDomain.value
                    ? [service.ingress.customDomain.value]
                    : [],
                porter_hosts: service.ingress.porterHosts.value
                    ? [service.ingress.porterHosts.value]
                    : [],
                annotations: ServiceArray.serialize(
                    service.ingress.annotations
                ),
            },
            service: {
                port: service.port.value,
            },
            health: {
                startupProbe: {
                    enabled: service.health.startupProbe.enabled.value,
                    failureThreshold:
                        service.health.startupProbe.failureThreshold.value,
                    path: service.health.startupProbe.path.value,
                    periodSeconds:
                        service.health.startupProbe.periodSeconds.value,
                },
                readinessProbe: {
                    enabled: service.health.readinessProbe.enabled.value,
                    failureThreshold:
                        service.health.readinessProbe.failureThreshold.value,
                    path: service.health.readinessProbe.path.value,
                    initialDelaySeconds:
                        service.health.readinessProbe.initialDelaySeconds.value,
                },
                livenessProbe: {
                    enabled: service.health.livenessProbe.enabled.value,
                    failureThreshold:
                        service.health.livenessProbe.failureThreshold.value,
                    path: service.health.livenessProbe.path.value,
                    periodSeconds:
                        service.health.livenessProbe.periodSeconds.value,
                },
            },
            cloudsql: {
                enabled: service.cloudsql.enabled.value,
                connectionName: service.cloudsql.connectionName.value,
                dbPort: service.cloudsql.dbPort.value,
                serviceAccountJSON: service.cloudsql.serviceAccountJSON.value,
            },
        };
    },
    deserialize: (
        name: string,
        values: any,
        porterJson?: PorterJson
    ): WebService => {
        return {
            name,
            cpu: ServiceField.string(
                values.resources?.requests?.cpu?.replace("m", ""),
                porterJson?.apps?.[name]?.config?.resources?.requests?.cpu
                    ? porterJson?.apps?.[
                          name
                      ]?.config?.resources?.requests?.cpu.replace("m", "")
                    : undefined
            ),
            ram: ServiceField.string(
                values.resources?.requests?.memory?.replace("Mi", "") ?? "",
                porterJson?.apps?.[name]?.config?.resources?.requests?.memory
                    ? porterJson?.apps?.[
                          name
                      ]?.config?.resources?.requests?.memory.replace("Mi", "")
                    : undefined
            ),
            startCommand: ServiceField.string(
                values.container?.command ?? "",
                porterJson?.apps?.[name]?.run
            ),
            type: "web",
            replicas: ServiceField.string(
                values.replicaCount ?? "",
                porterJson?.apps?.[name]?.config?.replicaCount
            ),
            autoscaling: {
                enabled: ServiceField.boolean(
                    values.autoscaling?.enabled ?? false,
                    porterJson?.apps?.[name]?.config?.autoscaling?.enabled
                ),
                minReplicas: ServiceField.string(
                    values.autoscaling?.minReplicas ?? "",
                    porterJson?.apps?.[name]?.config?.autoscaling?.minReplicas
                ),
                maxReplicas: ServiceField.string(
                    values.autoscaling?.maxReplicas ?? "",
                    porterJson?.apps?.[name]?.config?.autoscaling?.maxReplicas
                ),
                targetCPUUtilizationPercentage: ServiceField.string(
                    values.autoscaling?.targetCPUUtilizationPercentage ?? "",
                    porterJson?.apps?.[name]?.config?.autoscaling
                        ?.targetCPUUtilizationPercentage
                ),
                targetMemoryUtilizationPercentage: ServiceField.string(
                    values.autoscaling?.targetMemoryUtilizationPercentage ?? "",
                    porterJson?.apps?.[name]?.config?.autoscaling
                        ?.targetMemoryUtilizationPercentage
                ),
            },
            ingress: {
                enabled: ServiceField.boolean(
                    values.ingress?.enabled ?? false,
                    porterJson?.apps?.[name]?.config?.ingress?.enabled
                ),
                customDomain: ServiceField.string(
                    values.ingress?.hosts?.length
                        ? values.ingress.hosts[0]
                        : "",
                    porterJson?.apps?.[name]?.config?.ingress?.hosts?.length
                        ? porterJson?.apps?.[name]?.config?.ingress?.hosts[0]
                        : undefined
                ),
                hosts: ServiceField.string(
                    values.ingress?.hosts?.length
                        ? values.ingress.hosts[0]
                        : "",
                    porterJson?.apps?.[name]?.config?.ingress?.hosts?.length
                        ? porterJson?.apps?.[name]?.config?.ingress?.hosts[0]
                        : undefined
                ),
                porterHosts: ServiceField.string(
                    values.ingress?.porter_hosts?.length
                        ? values.ingress.porter_hosts[0]
                        : "",
                    porterJson?.apps?.[name]?.config?.ingress?.porter_hosts
                        ?.length
                        ? porterJson?.apps?.[name]?.config?.ingress
                              ?.porter_hosts[0]
                        : undefined
                ),
                annotations: ServiceField.array(
                    {},
                    porterJson?.apps?.[name]?.config?.ingress?.annotations
                ),
            },
            port: ServiceField.string(
                values.container?.port ?? "",
                porterJson?.apps?.[name]?.config?.container?.port
            ),
            canDelete: porterJson?.apps?.[name] == null,
            health: {
                startupProbe: {
                    enabled: ServiceField.boolean(
                        values.health?.startupProbe?.enabled ?? false,
                        porterJson?.apps?.[name]?.config?.health?.startupProbe
                            ?.enabled
                    ),
                    failureThreshold: ServiceField.string(
                        values.health?.startupProbe?.failureThreshold ?? "",
                        porterJson?.apps?.[name]?.config?.health?.startupProbe
                            ?.failureThreshold
                    ),
                    path: ServiceField.string(
                        values.health?.startupProbe?.path ?? "",
                        porterJson?.apps?.[name]?.config?.health?.startupProbe
                            ?.path
                    ),
                    periodSeconds: ServiceField.string(
                        values.health?.startupProbe?.periodSeconds ?? "",
                        porterJson?.apps?.[name]?.config?.health?.startupProbe
                            ?.periodSeconds
                    ),
                },
                readinessProbe: {
                    enabled: ServiceField.boolean(
                        values.health?.readinessProbe?.enabled ?? false,
                        porterJson?.apps?.[name]?.config?.health?.readinessProbe
                            ?.enabled
                    ),
                    failureThreshold: ServiceField.string(
                        values.health?.readinessProbe?.failureThreshold ?? "",
                        porterJson?.apps?.[name]?.config?.health?.readinessProbe
                            ?.failureThreshold
                    ),
                    path: ServiceField.string(
                        values.health?.readinessProbe?.path ?? "",
                        porterJson?.apps?.[name]?.config?.health?.readinessProbe
                            ?.path
                    ),
                    initialDelaySeconds: ServiceField.string(
                        values.health?.readinessProbe?.initialDelaySeconds ??
                            "",
                        porterJson?.apps?.[name]?.config?.health?.readinessProbe
                            ?.initialDelaySeconds
                    ),
                },
                livenessProbe: {
                    enabled: ServiceField.boolean(
                        values.health?.livenessProbe?.enabled ?? false,
                        porterJson?.apps?.[name]?.config?.health?.livenessProbe
                            ?.enabled
                    ),
                    failureThreshold: ServiceField.string(
                        values.health?.livenessProbe?.failureThreshold ?? "",
                        porterJson?.apps?.[name]?.config?.health?.livenessProbe
                            ?.failureThreshold
                    ),
                    path: ServiceField.string(
                        values.health?.livenessProbe?.path ?? "",
                        porterJson?.apps?.[name]?.config?.health?.livenessProbe
                            ?.path
                    ),
                    periodSeconds: ServiceField.string(
                        values.health?.livenessProbe?.periodSeconds ?? "",
                        porterJson?.apps?.[name]?.config?.health?.livenessProbe
                            ?.periodSeconds
                    ),
                },
            },
            cloudsql: {
                enabled: ServiceField.boolean(
                    values.cloudsql?.enabled ?? false,
                    porterJson?.apps?.[name]?.config?.cloudsql?.enabled
                ),
                connectionName: ServiceField.string(
                    values.cloudsql?.connectionName ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql?.connectionName
                ),
                dbPort: ServiceField.string(
                    values.cloudsql?.dbPort ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql?.dbPort
                ),
                serviceAccountJSON: ServiceField.string(
                    values.cloudsql?.serviceAccountJSON ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql
                        ?.serviceAccountJSON
                ),
            },
        };
    },
};

const WorkerService = {
    default: (name: string, porterJson?: PorterJson): WorkerService => ({
        name,
        cpu: ServiceField.string(
            "100",
            porterJson?.apps?.[name]?.config?.resources?.requests?.cpu
                ? porterJson?.apps?.[
                      name
                  ]?.config?.resources?.requests?.cpu.replace("m", "")
                : undefined
        ),
        ram: ServiceField.string(
            "256",
            porterJson?.apps?.[name]?.config?.resources?.requests?.memory
                ? porterJson?.apps?.[
                      name
                  ]?.config?.resources?.requests?.memory.replace("Mi", "")
                : undefined
        ),
        startCommand: ServiceField.string("", porterJson?.apps?.[name]?.run),
        type: "worker",
        replicas: ServiceField.string(
            "1",
            porterJson?.apps?.[name]?.config?.replicaCount
        ),
        autoscaling: {
            enabled: ServiceField.boolean(
                false,
                porterJson?.apps?.[name]?.config?.autoscaling?.enabled
            ),
            minReplicas: ServiceField.string(
                "1",
                porterJson?.apps?.[name]?.config?.autoscaling?.minReplicas
            ),
            maxReplicas: ServiceField.string(
                "10",
                porterJson?.apps?.[name]?.config?.autoscaling?.maxReplicas
            ),
            targetCPUUtilizationPercentage: ServiceField.string(
                "50",
                porterJson?.apps?.[name]?.config?.autoscaling
                    ?.targetCPUUtilizationPercentage
            ),
            targetMemoryUtilizationPercentage: ServiceField.string(
                "50",
                porterJson?.apps?.[name]?.config?.autoscaling
                    ?.targetMemoryUtilizationPercentage
            ),
        },
        canDelete: porterJson?.apps?.[name] == null,
        cloudsql: {
            enabled: ServiceField.boolean(
                false,
                porterJson?.apps?.[name]?.config?.cloudsql?.enabled
            ),
            connectionName: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.cloudsql?.connectionName
            ),
            dbPort: ServiceField.string(
                "5432",
                porterJson?.apps?.[name]?.config?.cloudsql?.dbPort
            ),
            serviceAccountJSON: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.cloudsql?.serviceAccountJSON
            ),
        },
    }),
    serialize: (service: WorkerService) => {
        return {
            replicaCount: service.replicas.value,
            container: {
                command: service.startCommand.value,
            },
            resources: {
                requests: {
                    cpu: service.cpu.value + "m",
                    memory: service.ram.value + "Mi",
                },
            },
            autoscaling: {
                enabled: service.autoscaling.enabled.value,
                minReplicas: service.autoscaling.minReplicas.value,
                maxReplicas: service.autoscaling.maxReplicas.value,
                targetCPUUtilizationPercentage:
                    service.autoscaling.targetCPUUtilizationPercentage.value,
                targetMemoryUtilizationPercentage:
                    service.autoscaling.targetMemoryUtilizationPercentage.value,
            },
            cloudsql: {
                enabled: service.cloudsql.enabled.value,
                connectionName: service.cloudsql.connectionName.value,
                dbPort: service.cloudsql.dbPort.value,
                serviceAccountJSON: service.cloudsql.serviceAccountJSON.value,
            },
        };
    },
    deserialize: (
        name: string,
        values: any,
        porterJson?: PorterJson
    ): WorkerService => {
        return {
            name,
            cpu: ServiceField.string(
                values.resources?.requests?.cpu?.replace("m", ""),
                porterJson?.apps?.[name]?.config?.resources?.requests?.cpu
                    ? porterJson?.apps?.[
                          name
                      ]?.config?.resources?.requests?.cpu.replace("m", "")
                    : undefined
            ),
            ram: ServiceField.string(
                values.resources?.requests?.memory?.replace("Mi", "") ?? "",
                porterJson?.apps?.[name]?.config?.resources?.requests?.memory
                    ? porterJson?.apps?.[
                          name
                      ]?.config?.resources?.requests?.memory.replace("Mi", "")
                    : undefined
            ),
            startCommand: ServiceField.string(
                values.container?.command ?? "",
                porterJson?.apps?.[name]?.run
            ),
            type: "worker",
            replicas: ServiceField.string(
                values.replicaCount ?? "",
                porterJson?.apps?.[name]?.config?.replicaCount
            ),
            autoscaling: {
                enabled: ServiceField.boolean(
                    values.autoscaling?.enabled ?? false,
                    porterJson?.apps?.[name]?.config?.autoscaling?.enabled
                ),
                minReplicas: ServiceField.string(
                    values.autoscaling?.minReplicas ?? "",
                    porterJson?.apps?.[name]?.config?.autoscaling?.minReplicas
                ),
                maxReplicas: ServiceField.string(
                    values.autoscaling?.maxReplicas ?? "",
                    porterJson?.apps?.[name]?.config?.autoscaling?.maxReplicas
                ),
                targetCPUUtilizationPercentage: ServiceField.string(
                    values.autoscaling?.targetCPUUtilizationPercentage ?? "",
                    porterJson?.apps?.[name]?.config?.autoscaling
                        ?.targetCPUUtilizationPercentage
                ),
                targetMemoryUtilizationPercentage: ServiceField.string(
                    values.autoscaling?.targetMemoryUtilizationPercentage ?? "",
                    porterJson?.apps?.[name]?.config?.autoscaling
                        ?.targetMemoryUtilizationPercentage
                ),
            },
            canDelete: porterJson?.apps?.[name] == null,
            cloudsql: {
                enabled: ServiceField.boolean(
                    values.cloudsql?.enabled ?? false,
                    porterJson?.apps?.[name]?.config?.cloudsql?.enabled
                ),
                connectionName: ServiceField.string(
                    values.cloudsql?.connectionName ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql?.connectionName
                ),
                dbPort: ServiceField.string(
                    values.cloudsql?.dbPort ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql?.dbPort
                ),
                serviceAccountJSON: ServiceField.string(
                    values.cloudsql?.serviceAccountJSON ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql
                        ?.serviceAccountJSON
                ),
            },
        };
    },
};

const JobService = {
    default: (name: string, porterJson?: PorterJson): JobService => ({
        name,
        cpu: ServiceField.string(
            "100",
            porterJson?.apps?.[name]?.config?.resources?.requests?.cpu
                ? porterJson?.apps?.[
                      name
                  ]?.config?.resources?.requests?.cpu.replace("m", "")
                : undefined
        ),
        ram: ServiceField.string(
            "256",
            porterJson?.apps?.[name]?.config?.resources?.requests?.memory
                ? porterJson?.apps?.[
                      name
                  ]?.config?.resources?.requests?.memory.replace("Mi", "")
                : undefined
        ),
        startCommand: ServiceField.string("", porterJson?.apps?.[name]?.run),
        type: "job",
        jobsExecuteConcurrently: ServiceField.boolean(
            false,
            porterJson?.apps?.[name]?.config?.allowConcurrent
        ),
        cronSchedule: ServiceField.string(
            "*/10 * * * *",
            porterJson?.apps?.[name]?.config?.schedule?.value
        ),
        canDelete: porterJson?.apps?.[name] == null,
        cloudsql: {
            enabled: ServiceField.boolean(
                false,
                porterJson?.apps?.[name]?.config?.cloudsql?.enabled
            ),
            connectionName: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.cloudsql?.connectionName
            ),
            dbPort: ServiceField.string(
                "5432",
                porterJson?.apps?.[name]?.config?.cloudsql?.dbPort
            ),
            serviceAccountJSON: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.cloudsql?.serviceAccountJSON
            ),
        },
    }),
    serialize: (service: JobService) => {
        return {
            allowConcurrent: service.jobsExecuteConcurrently.value,
            container: {
                command: service.startCommand.value,
            },
            resources: {
                requests: {
                    cpu: service.cpu.value + "m",
                    memory: service.ram.value + "Mi",
                },
            },
            schedule: {
                enabled: service.cronSchedule.value ? true : false,
                value: service.cronSchedule.value,
            },
            paused: true,
            cloudsql: {
                enabled: service.cloudsql.enabled.value,
                connectionName: service.cloudsql.connectionName.value,
                dbPort: service.cloudsql.dbPort.value,
                serviceAccountJSON: service.cloudsql.serviceAccountJSON.value,
            },
        };
    },
    deserialize: (
        name: string,
        values: any,
        porterJson?: PorterJson
    ): JobService => {
        return {
            name,
            cpu: ServiceField.string(
                values.resources?.requests?.cpu?.replace("m", ""),
                porterJson?.apps?.[name]?.config?.resources?.requests?.cpu
                    ? porterJson?.apps?.[
                          name
                      ]?.config?.resources?.requests?.cpu.replace("m", "")
                    : undefined
            ),
            ram: ServiceField.string(
                values.resources?.requests?.memory?.replace("Mi", "") ?? "",
                porterJson?.apps?.[name]?.config?.resources?.requests?.memory
                    ? porterJson?.apps?.[
                          name
                      ]?.config?.resources?.requests?.memory.replace("Mi", "")
                    : undefined
            ),
            startCommand: ServiceField.string(
                values.container?.command ?? "",
                porterJson?.apps?.[name]?.run
            ),
            type: "job",
            jobsExecuteConcurrently: ServiceField.boolean(
                values.allowConcurrent ?? false,
                porterJson?.apps?.[name]?.config?.allowConcurrent
            ),
            cronSchedule: ServiceField.string(
                values.schedule?.value ?? "",
                porterJson?.apps?.[name]?.config?.schedule?.value
            ),
            canDelete: porterJson?.apps?.[name] == null,
            cloudsql: {
                enabled: ServiceField.boolean(
                    values.cloudsql?.enabled ?? false,
                    porterJson?.apps?.[name]?.config?.cloudsql?.enabled
                ),
                connectionName: ServiceField.string(
                    values.cloudsql?.connectionName ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql?.connectionName
                ),
                dbPort: ServiceField.string(
                    values.cloudsql?.dbPort ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql?.dbPort
                ),
                serviceAccountJSON: ServiceField.string(
                    values.cloudsql?.serviceAccountJSON ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql
                        ?.serviceAccountJSON
                ),
            },
        };
    },
};

const ReleaseService = {
    default: (name: string, porterJson?: PorterJson): ReleaseService => ({
        name,
        cpu: ServiceField.string(
            "100",
            porterJson?.release?.config?.resources?.requests?.cpu
                ? porterJson?.release?.config?.resources?.requests?.cpu.replace(
                      "m",
                      ""
                  )
                : undefined
        ),
        ram: ServiceField.string(
            "256",
            porterJson?.release?.config?.resources?.requests?.memory
                ? porterJson?.release?.config?.resources?.requests?.memory.replace(
                      "Mi",
                      ""
                  )
                : undefined
        ),
        startCommand: ServiceField.string("", porterJson?.release?.run),
        type: "release",
        canDelete: porterJson?.release == null,
        cloudsql: {
            enabled: ServiceField.boolean(
                false,
                porterJson?.apps?.[name]?.config?.cloudsql?.enabled
            ),
            connectionName: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.cloudsql?.connectionName
            ),
            dbPort: ServiceField.string(
                "5432",
                porterJson?.apps?.[name]?.config?.cloudsql?.dbPort
            ),
            serviceAccountJSON: ServiceField.string(
                "",
                porterJson?.apps?.[name]?.config?.cloudsql?.serviceAccountJSON
            ),
        },
    }),

    serialize: (service: ReleaseService) => {
        return {
            container: {
                command: service.startCommand.value,
            },
            resources: {
                requests: {
                    cpu: service.cpu.value + "m",
                    memory: service.ram.value + "Mi",
                },
            },
            paused: true, // this makes sure the release isn't run immediately. it is flipped when the porter apply runs the release in the GHA
            cloudsql: {
                enabled: service.cloudsql.enabled.value,
                connectionName: service.cloudsql.connectionName.value,
                dbPort: service.cloudsql.dbPort.value,
                serviceAccountJSON: service.cloudsql.serviceAccountJSON.value,
            },
        };
    },

    deserialize: (
        name: string,
        values: any,
        porterJson?: PorterJson
    ): ReleaseService => {
        return {
            name,
            cpu: ServiceField.string(
                values?.resources?.requests?.cpu?.replace("m", ""),
                porterJson?.release?.config?.resources?.requests?.cpu
                    ? porterJson?.release?.config?.resources?.requests?.cpu.replace(
                          "m",
                          ""
                      )
                    : undefined
            ),
            ram: ServiceField.string(
                values?.resources?.requests?.memory?.replace("Mi", "") ?? "",
                porterJson?.release?.config?.resources?.requests?.memory
                    ? porterJson?.release?.config?.resources?.requests?.memory.replace(
                          "Mi",
                          ""
                      )
                    : undefined
            ),
            startCommand: ServiceField.string(
                values?.container?.command ?? "",
                porterJson?.release?.run
            ),
            type: "release",
            canDelete: porterJson?.release == null,
            cloudsql: {
                enabled: ServiceField.boolean(
                    values.cloudsql?.enabled ?? false,
                    porterJson?.apps?.[name]?.config?.cloudsql?.enabled
                ),
                connectionName: ServiceField.string(
                    values.cloudsql?.connectionName ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql?.connectionName
                ),
                dbPort: ServiceField.string(
                    values.cloudsql?.dbPort ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql?.dbPort
                ),
                serviceAccountJSON: ServiceField.string(
                    values.cloudsql?.serviceAccountJSON ?? "",
                    porterJson?.apps?.[name]?.config?.cloudsql
                        ?.serviceAccountJSON
                ),
            },
        };
    },
};

const TYPE_TO_SUFFIX: Record<ServiceType, string> = {
    web: "-web",
    worker: "-wkr",
    job: "-job",
    release: "",
};
const SUFFIX_TO_TYPE: Record<string, ServiceType> = {
    "-web": "web",
    "-wkr": "worker",
    "-job": "job",
};

export const Service = {
    // populates an empty service
    default: (name: string, type: ServiceType, porterJson?: PorterJson) => {
        switch (type) {
            case "web":
                return WebService.default(name, porterJson);
            case "worker":
                return WorkerService.default(name, porterJson);
            case "job":
                return JobService.default(name, porterJson);
            case "release":
                return ReleaseService.default(name, porterJson);
        }
    },

    // converts a service to a helm values object
    serialize: (service: Service) => {
        switch (service.type) {
            case "web":
                return WebService.serialize(service);
            case "worker":
                return WorkerService.serialize(service);
            case "job":
                return JobService.serialize(service);
            case "release":
                return ReleaseService.serialize(service);
        }
    },

    // converts a helm values object and porter json (from their repo) to a service
    deserialize: (
        helmValues: any,
        defaultValues: any,
        porterJson?: PorterJson
    ): Service[] => {
        if (defaultValues == null) {
            return [];
        }
        return Object.keys(defaultValues)
            .map((name: string) => {
                const suffix = name.slice(-4);
                if (suffix in SUFFIX_TO_TYPE) {
                    const type = SUFFIX_TO_TYPE[suffix];
                    const appName = name.slice(0, -4);
                    const coalescedValues = overrideObjectValues(
                        defaultValues[name],
                        helmValues?.[name] ?? {}
                    );
                    switch (type) {
                        case "web":
                            return WebService.deserialize(
                                appName,
                                coalescedValues,
                                porterJson
                            );
                        case "worker":
                            return WorkerService.deserialize(
                                appName,
                                coalescedValues,
                                porterJson
                            );
                        case "job":
                            return JobService.deserialize(
                                appName,
                                coalescedValues,
                                porterJson
                            );
                    }
                }
            })
            .filter(
                (service: Service | undefined): service is Service =>
                    service != null
            ) as Service[];
    },
    // TODO: consolidate these
    deserializeRelease: (
        helmValues: any,
        porterJson?: PorterJson
    ): ReleaseService => {
        return ReleaseService.deserialize("pre-deploy", helmValues, porterJson);
    },

    // standard typeguards
    isWeb: (service: Service): service is WebService => service.type === "web",
    isWorker: (service: Service): service is WorkerService =>
        service.type === "worker",
    isJob: (service: Service): service is JobService => service.type === "job",
    isRelease: (service: Service): service is ReleaseService =>
        service.type === "release",
    isNonRelease: (
        service: Service
    ): service is Exclude<Service, ReleaseService> =>
        service.type !== "release",

    // required because of https://github.com/helm/helm/issues/9214
    toHelmName: (service: Service): string => {
        return service.name + TYPE_TO_SUFFIX[service.type];
    },

    retrieveEnvFromHelmValues: (helmValues: any): KeyValueType[] => {
        const firstService = Object.keys(helmValues)[0];
        const env = helmValues[firstService]?.container?.env?.normal;
        if (env == null) {
            return [];
        }
        try {
            return Object.keys(env).map((key: string) => ({
                key,
                value: env[key],
                hidden: false,
                locked: false,
                deleted: false,
            }));
        } catch (err) {
            // TODO: handle error
            return [];
        }
    },

    retrieveSubdomainFromHelmValues: (
        services: Service[],
        helmValues: any
    ): string => {
        const webServices = services.filter(Service.isWeb);
        if (webServices.length == 0) {
            return "";
        }

        let matchedWebCount = 0;
        let matchedWebHost = "";

        for (const web of webServices) {
            const values = helmValues[Service.toHelmName(web)];
            if (
                values == null ||
                values.ingress == null ||
                !values.ingress.enabled
            ) {
                continue;
            }
            if (
                values.ingress.porter_hosts?.length > 0 ||
                (values.ingress.custom_domain &&
                    values.ingress.hosts?.length > 0)
            ) {
                if (
                    values.ingress.custom_domain &&
                    values.ingress.hosts?.length > 0
                ) {
                    // if they have a custom domain, use that
                    matchedWebHost = values.ingress.hosts[0];
                } else {
                    // otherwise, use their porter domain
                    matchedWebHost = values.ingress.porter_hosts[0];
                }
                matchedWebCount++;
            }
        }

        // if multiple web services have a subdomain, return nothing
        if (matchedWebCount > 1) {
            return "";
        }

        return matchedWebHost;
    },

    prefixSubdomain: (subdomain: string) => {
        if (
            subdomain.startsWith("https://") ||
            subdomain.startsWith("http://")
        ) {
            return subdomain;
        }
        return "https://" + subdomain;
    },
};
