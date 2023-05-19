import _ from "lodash";
import { overrideObjectValues } from "./utils";
import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { PorterJson } from "./schema";

export type Service = WorkerService | WebService | JobService | ReleaseService;
export type ServiceType = 'web' | 'worker' | 'job' | 'release';

type ServiceString = {
    readOnly: boolean;
    value: string;
}
type ServiceBoolean = {
    readOnly: boolean;
    value: boolean;
}
type Ingress = {
    enabled: ServiceBoolean;
    hosts: ServiceString;
    porterHosts: ServiceString;
}

type Autoscaling = {
    enabled: ServiceBoolean,
    minReplicas: ServiceString,
    maxReplicas: ServiceString,
    targetCPUUtilizationPercentage: ServiceString,
    targetMemoryUtilizationPercentage: ServiceString,
}
//   livenessCommand:
//     command: ls -l
//     enabled: false
//     failureThreshold: 3
//     initialDelaySeconds: 5
//     periodSeconds: 5
//     successThreshold: 1
//     timeoutSeconds: 1
//   livenessProbe:
//     auth:
//       enabled: false
//       password: ''
//       username: ''
//     enabled: false
//     failureThreshold: 3
//     initialDelaySeconds: 0
//     path: /livez
//     periodSeconds: 5
//     scheme: HTTP
//     successThreshold: 1
//     timeoutSeconds: 1
//   readinessProbe:
//     auth:
//       enabled: false
//       password: ''
//       username: ''
//     enabled: false
//     failureThreshold: 3
//     initialDelaySeconds: 0
//     path: /readyz
//     periodSeconds: 5
//     scheme: HTTP
//     successThreshold: 1
//     timeoutSeconds: 1
//   startupProbe:
//     auth:
//       enabled: false
//       password: ''
//       username: ''
//     enabled: false
//     failureThreshold: 3
//     path: /startupz
//     periodSeconds: 5
//     scheme: HTTP
//     timeoutSeconds: 1
type livenessCommand = {
    command: ServiceString,
    enabled: ServiceBoolean,
    failureThreshold: ServiceString,
    initialDelaySeconds: ServiceString,
    periodSeconds: ServiceString,
    successThreshold: ServiceString,
    timeoutSeconds: ServiceString,
}
type Auth ={
    enabled: ServiceBoolean,
    password: ServiceString,
    username: ServiceString,
}
type  LivenessProbe = {
    enabled: ServiceBoolean,
    failureThreshold: ServiceString,
    initialDelaySeconds: ServiceString,
    path: ServiceString,
    periodSeconds: ServiceString,
    scheme: ServiceString,
    successThreshold: ServiceString,
    timeoutSeconds: ServiceString,
    auth: Auth,
}
type  ReadinessProbe = {
    auth: Auth,
    enabled: ServiceBoolean,
    failureThreshold: ServiceString,
    initialDelaySeconds: ServiceString,
    path: ServiceString,
    periodSeconds: ServiceString,
    scheme: ServiceString,
    successThreshold: ServiceString,
    timeoutSeconds: ServiceString,
}
type  StartUpProbe = {
    auth: Auth,
    enabled: ServiceBoolean,
    failureThreshold: ServiceString,
    path: ServiceString,
    periodSeconds: ServiceString,
    scheme: ServiceString,
    timeoutSeconds: ServiceString,
}

type Health = {
    livenessProbe: LivenessProbe,
    startupProbe: StartUpProbe,
    readinessProbe: ReadinessProbe,
    livenessCommand: livenessCommand,
}


const ServiceField = {
    string: (defaultValue: string, overrideValue?: string): ServiceString => {
        return {
            readOnly: overrideValue != null,
            value: overrideValue ?? defaultValue,
        }
    },
    boolean: (defaultValue: boolean, overrideValue?: boolean): ServiceBoolean => {
        return {
            readOnly: overrideValue != null,
            value: overrideValue ?? defaultValue,
        }
    },
}

type SharedServiceParams = {
    name: string;
    cpu: ServiceString;
    ram: ServiceString;
    startCommand: ServiceString;
    type: ServiceType;
    canDelete: boolean;
}

export type WorkerService = SharedServiceParams & {
    type: 'worker';
    replicas: ServiceString;
    autoscaling: Autoscaling;
}
const WorkerService = {
    default: (name: string, porterJson?: PorterJson): WorkerService => ({
        name,
        cpu: ServiceField.string('100', porterJson?.apps?.[name]?.config?.resources?.requests?.cpu ? porterJson?.apps?.[name]?.config?.resources?.requests?.cpu.replace('m', '') : undefined),
        ram: ServiceField.string('256', porterJson?.apps?.[name]?.config?.resources?.requests?.memory ? porterJson?.apps?.[name]?.config?.resources?.requests?.memory.replace('Mi', '') : undefined),
        startCommand: ServiceField.string('', porterJson?.apps?.[name]?.run),
        type: 'worker',
        replicas: ServiceField.string('1', porterJson?.apps?.[name]?.config?.replicaCount),
        autoscaling: {
            enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.autoscaling?.enabled),
            minReplicas: ServiceField.string('1', porterJson?.apps?.[name]?.config?.autoscaling?.minReplicas),
            maxReplicas: ServiceField.string('10', porterJson?.apps?.[name]?.config?.autoscaling?.maxReplicas),
            targetCPUUtilizationPercentage: ServiceField.string('50', porterJson?.apps?.[name]?.config?.autoscaling?.targetCPUUtilizationPercentage),
            targetMemoryUtilizationPercentage: ServiceField.string('50', porterJson?.apps?.[name]?.config?.autoscaling?.targetMemoryUtilizationPercentage),
        },
        canDelete: porterJson?.apps?.[name] == null,
    }),
    serialize: (service: WorkerService) => {
        return {
            replicaCount: service.replicas.value,
            container: {
                command: service.startCommand.value,
            },
            resources: {
                requests: {
                    cpu: service.cpu.value + 'm',
                    memory: service.ram.value + 'Mi',
                }
            },
            autoscaling: {
                enabled: service.autoscaling.enabled.value,
                minReplicas: service.autoscaling.minReplicas.value,
                maxReplicas: service.autoscaling.maxReplicas.value,
                targetCPUUtilizationPercentage: service.autoscaling.targetCPUUtilizationPercentage.value,
                targetMemoryUtilizationPercentage: service.autoscaling.targetMemoryUtilizationPercentage.value,
            },
        }
    },
    deserialize: (name: string, values: any, porterJson?: PorterJson): WorkerService => {
        return {
            name,
            cpu: ServiceField.string(values.resources?.requests?.cpu?.replace('m', ''), porterJson?.apps?.[name]?.config?.resources?.requests?.cpu ? porterJson?.apps?.[name]?.config?.resources?.requests?.cpu.replace('m', '') : undefined),
            ram: ServiceField.string(values.resources?.requests?.memory?.replace('Mi', '') ?? '', porterJson?.apps?.[name]?.config?.resources?.requests?.memory ? porterJson?.apps?.[name]?.config?.resources?.requests?.memory.replace('Mi', '') : undefined),
            startCommand: ServiceField.string(values.container?.command ?? '', porterJson?.apps?.[name]?.run),
            type: 'worker',
            replicas: ServiceField.string(values.replicaCount ?? '', porterJson?.apps?.[name]?.config?.replicaCount),
            autoscaling: {
                enabled: ServiceField.boolean(values.autoscaling?.enabled ?? false, porterJson?.apps?.[name]?.config?.autoscaling?.enabled),
                minReplicas: ServiceField.string(values.autoscaling?.minReplicas ?? '', porterJson?.apps?.[name]?.config?.autoscaling?.minReplicas),
                maxReplicas: ServiceField.string(values.autoscaling?.maxReplicas ?? '', porterJson?.apps?.[name]?.config?.autoscaling?.maxReplicas),
                targetCPUUtilizationPercentage: ServiceField.string(values.autoscaling?.targetCPUUtilizationPercentage ?? '', porterJson?.apps?.[name]?.config?.autoscaling?.targetCPUUtilizationPercentage),
                targetMemoryUtilizationPercentage: ServiceField.string(values.autoscaling?.targetMemoryUtilizationPercentage ?? '', porterJson?.apps?.[name]?.config?.autoscaling?.targetMemoryUtilizationPercentage),
            },
            canDelete: porterJson?.apps?.[name] == null,
        }
    }
}

export type WebService = SharedServiceParams & Omit<WorkerService, 'type'> & {
    type: 'web';
    port: ServiceString;
    ingress: Ingress;
    health: Health;
}
const WebService = {
    default: (name: string, porterJson?: PorterJson): WebService => ({
        name,
        cpu: ServiceField.string('100', porterJson?.apps?.[name]?.config?.resources?.requests?.cpu ? porterJson?.apps?.[name]?.config?.resources?.requests?.cpu.replace('m', '') : undefined),
        ram: ServiceField.string('256', porterJson?.apps?.[name]?.config?.resources?.requests?.memory ? porterJson?.apps?.[name]?.config?.resources?.requests?.memory.replace('Mi', '') : undefined),
        startCommand: ServiceField.string('', porterJson?.apps?.[name]?.run),
        type: 'web',
        replicas: ServiceField.string('1', porterJson?.apps?.[name]?.config?.replicaCount),
        autoscaling: {
            enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.autoscaling?.enabled),
            minReplicas: ServiceField.string('1', porterJson?.apps?.[name]?.config?.autoscaling?.minReplicas),
            maxReplicas: ServiceField.string('10', porterJson?.apps?.[name]?.config?.autoscaling?.maxReplicas),
            targetCPUUtilizationPercentage: ServiceField.string('50', porterJson?.apps?.[name]?.config?.autoscaling?.targetCPUUtilizationPercentage),
            targetMemoryUtilizationPercentage: ServiceField.string('50', porterJson?.apps?.[name]?.config?.autoscaling?.targetMemoryUtilizationPercentage),
        },
        ingress: {
            enabled: ServiceField.boolean(true, porterJson?.apps?.[name]?.config?.ingress?.enabled),
            hosts: ServiceField.string('', porterJson?.apps?.[name]?.config?.ingress?.hosts?.length ? porterJson?.apps?.[name]?.config?.ingress?.hosts[0] : undefined),
            porterHosts: ServiceField.string('', porterJson?.apps?.[name]?.config?.ingress?.porter_hosts?.length ? porterJson?.apps?.[name]?.config?.ingress?.porter_hosts[0] : undefined),
        },
        port: ServiceField.string('3000', porterJson?.apps?.[name]?.config?.container?.port),
        canDelete: porterJson?.apps?.[name] == null,
        health: {
            startupProbe:{
                auth:{
                    enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.health?.startupProbe?.auth?.enabled),
                    password: ServiceField.string('', porterJson?.apps?.[name]?.config?.health?.startupProbe?.auth?.password),
                    username: ServiceField.string('', porterJson?.apps?.[name]?.config?.health?.startupProbe?.auth?.username)
                },
                enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.health?.startupProbe?.enabled),
                failureThreshold: ServiceField.string('3', porterJson?.apps?.[name]?.config?.health?.startupProbe?.failureThreshold),
                path: ServiceField.string('/startupz', porterJson?.apps?.[name]?.config?.health?.startupProbe?.path),
                periodSeconds: ServiceField.string('5', porterJson?.apps?.[name]?.config?.health?.startupProbe?.periodSeconds),
                scheme: ServiceField.string('HTTP', porterJson?.apps?.[name]?.config?.health?.startupProbe?.scheme),
                timeoutSeconds: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.startupProbe?.timeoutSeconds),
            },
            readinessProbe:{
                auth:{
                    enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.health?.readinessProbe?.auth?.enabled),
                    password: ServiceField.string('', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.auth?.password),
                    username: ServiceField.string('', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.auth?.username)
                },
                enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.health?.readinessProbe?.enabled),
                failureThreshold: ServiceField.string('3', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.failureThreshold),
                initialDelaySeconds: ServiceField.string('0', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.initialDelaySeconds),
                path: ServiceField.string('/readyz', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.path),
                periodSeconds: ServiceField.string('5', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.periodSeconds),
                scheme: ServiceField.string('HTTP', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.scheme),
                timeoutSeconds: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.timeoutSeconds),
                successThreshold: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.successThreshold),
            },
            livenessCommand:{
                command: ServiceField.string('ls -l', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.command),
                enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.health?.livenessCommand?.enabled),
                failureThreshold: ServiceField.string('3', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.failureThreshold),
                initialDelaySeconds: ServiceField.string('5', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.initialDelaySeconds),
                periodSeconds: ServiceField.string('5', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.periodSeconds),
                timeoutSeconds: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.timeoutSeconds),
                successThreshold: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.successThreshold),
            },
            livenessProbe:{
                auth:{
                    enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.health?.livenessProbe?.auth?.enabled),
                    password: ServiceField.string('', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.auth?.password),
                    username: ServiceField.string('', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.auth?.username)
                },
                failureThreshold: ServiceField.string('3', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.failureThreshold),
                initialDelaySeconds: ServiceField.string('0', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.initialDelaySeconds),
                path: ServiceField.string('/livez', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.path),
                periodSeconds: ServiceField.string('5', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.periodSeconds),
                scheme: ServiceField.string('HTTP', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.scheme),
                successThreshold: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.successThreshold),
                timeoutSeconds: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.timeoutSeconds),
                enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.health?.livenessProbe?.enabled),
            },
        }
    }),
    serialize: (service: WebService) => {
        return {
            replicaCount: service.replicas.value,
            resources: {
                requests: {
                    cpu: service.cpu.value + 'm',
                    memory: service.ram.value + 'Mi',
                }
            },
            container: {
                command: service.startCommand.value,
                port: service.port.value,
            },
            service: {
                port: service.port.value,
            },
            autoscaling: {
                enabled: service.autoscaling.enabled.value,
                minReplicas: service.autoscaling.minReplicas.value,
                maxReplicas: service.autoscaling.maxReplicas.value,
                targetCPUUtilizationPercentage: service.autoscaling.targetCPUUtilizationPercentage.value,
                targetMemoryUtilizationPercentage: service.autoscaling.targetMemoryUtilizationPercentage.value,
            },
            ingress: {
                enabled: service.ingress.enabled.value,
                hosts: service.ingress.hosts.value ? [service.ingress.hosts.value] : [],
                custom_domain: service.ingress.hosts.value ? true : false,
                porter_hosts: service.ingress.porterHosts.value ? [service.ingress.porterHosts.value] : [],
            },
            health: {
                startupProbe: service.health.startupProbe ? {
                    auth:{
                        enabled: service.health.livenessProbe.auth?.enabled ? service.health.startupProbe.auth.enabled.value : false,
                        password: service.health.livenessProbe.auth?.password ? service.health.startupProbe.auth.password.value : '',
                        username: service.health.livenessProbe.auth?.username ? service.health.startupProbe.auth.username.value : '',
                    },
                    enabled: service.health.startupProbe.enabled ? service.health.startupProbe.enabled.value : false,
                    failureThreshold:  service.health.startupProbe.failureThreshold ? service.health.startupProbe.failureThreshold.value : '3',
                    path: service.health.startupProbe.path ? service.health.startupProbe.path.value : '/startupz',
                    periodSeconds: service.health.startupProbe.periodSeconds ? service.health.startupProbe.periodSeconds.value : '5',
                    scheme: service.health.startupProbe.scheme ? service.health.startupProbe.scheme.value : 'HTTP',
                    timeoutSeconds: service.health.startupProbe.timeoutSeconds ? service.health.startupProbe.timeoutSeconds.value : '1',
                } : {},
                readinessProbe: service.health.readinessProbe ? {
                    auth:{
                        enabled: service.health.readinessProbe.auth?.enabled ? service.health.readinessProbe.auth.enabled.value : false,
                        password: service.health.readinessProbe.auth?.password ? service.health.readinessProbe.auth.password.value : '',
                        username: service.health.readinessProbe.auth?.username ? service.health.readinessProbe.auth.username.value : '',
                    },
                    enabled: service.health.readinessProbe.enabled ? service.health.readinessProbe.enabled.value : false,
                    failureThreshold:service.health.readinessProbe.failureThreshold ? service.health.readinessProbe.failureThreshold.value : '3',
                    initialDelaySeconds: service.health.readinessProbe.initialDelaySeconds ? service.health.readinessProbe.initialDelaySeconds.value : '0',
                    path: service.health.readinessProbe.path ? service.health.readinessProbe.path.value : '/readyz',
                    periodSeconds: service.health.readinessProbe.periodSeconds ? service.health.readinessProbe.periodSeconds.value : '5',
                    scheme: service.health.readinessProbe.scheme ? service.health.readinessProbe.scheme.value : 'HTTP',
                    timeoutSeconds: service.health.readinessProbe.timeoutSeconds ? service.health.readinessProbe.timeoutSeconds.value : '1',
                    successThreshold: service.health.readinessProbe.successThreshold ? service.health.readinessProbe.successThreshold.value : '1',
                } : {},
                livenessCommand: service.health.livenessCommand ? {
                    command: service.health.livenessCommand.command ? service.health.livenessCommand.command.value : 'ls -l',
                    enabled: service.health.livenessCommand.enabled ? service.health.livenessCommand.enabled.value : false,
                    failureThreshold: service.health.livenessCommand.failureThreshold ? service.health.livenessCommand.failureThreshold.value : '3',
                    initialDelaySeconds: service.health.livenessCommand.initialDelaySeconds ? service.health.livenessCommand.initialDelaySeconds.value : '5',
                    periodSeconds: service.health.livenessCommand.periodSeconds ? service.health.livenessCommand.periodSeconds.value : '5',
                    timeoutSeconds:service.health.livenessCommand.timeoutSeconds ? service.health.livenessCommand.timeoutSeconds.value : '1' ,
                    successThreshold: service.health.livenessCommand.successThreshold ? service.health.livenessCommand.successThreshold.value : '1',
                } : {},
                livenessProbe: service.health.livenessProbe ? {
                    auth:{
                        enabled: service.health.livenessProbe.auth ? service.health.livenessProbe.auth.enabled.value : false,
                        password: service.health.livenessProbe.auth ? service.health.livenessProbe.auth.password.value : '',
                        username: service.health.livenessProbe.auth ? service.health.livenessProbe.auth.username.value : '',
                    },
                    failureThreshold: service.health.livenessProbe.failureThreshold ? service.health.livenessProbe.failureThreshold.value : '3',
                    initialDelaySeconds: service.health.livenessProbe.initialDelaySeconds ? service.health.livenessProbe.initialDelaySeconds.value : '0',
                    path: service.health.livenessProbe.path ? service.health.livenessProbe.path.value : '/livez',
                    periodSeconds: service.health.livenessProbe.periodSeconds ? service.health.livenessProbe.periodSeconds.value : '5',
                    scheme: service.health.livenessProbe.scheme ? service.health.livenessProbe.scheme.value : 'HTTP',
                    successThreshold: service.health.livenessProbe.successThreshold ? service.health.livenessProbe.successThreshold.value : '1',
                    timeoutSeconds: service.health.livenessProbe.timeoutSeconds ? service.health.livenessProbe.timeoutSeconds.value : '1',
                    enabled:  service.health.livenessProbe.enabled ? service.health.livenessProbe.enabled.value : false,
                } : {},
            }
        }
    },
    deserialize: (name: string, values: any, porterJson?: PorterJson): WebService => {
        return {
            name,
            cpu: ServiceField.string(values.resources?.requests?.cpu?.replace('m', ''), porterJson?.apps?.[name]?.config?.resources?.requests?.cpu ? porterJson?.apps?.[name]?.config?.resources?.requests?.cpu.replace('m', '') : undefined),
            ram: ServiceField.string(values.resources?.requests?.memory?.replace('Mi', '') ?? '', porterJson?.apps?.[name]?.config?.resources?.requests?.memory ? porterJson?.apps?.[name]?.config?.resources?.requests?.memory.replace('Mi', '') : undefined),
            startCommand: ServiceField.string(values.container?.command ?? '', porterJson?.apps?.[name]?.run),
            type: 'web',
            replicas: ServiceField.string(values.replicaCount ?? '', porterJson?.apps?.[name]?.config?.replicaCount),
            autoscaling: {
                enabled: ServiceField.boolean(values.autoscaling?.enabled ?? false, porterJson?.apps?.[name]?.config?.autoscaling?.enabled),
                minReplicas: ServiceField.string(values.autoscaling?.minReplicas ?? '', porterJson?.apps?.[name]?.config?.autoscaling?.minReplicas),
                maxReplicas: ServiceField.string(values.autoscaling?.maxReplicas ?? '', porterJson?.apps?.[name]?.config?.autoscaling?.maxReplicas),
                targetCPUUtilizationPercentage: ServiceField.string(values.autoscaling?.targetCPUUtilizationPercentage ?? '', porterJson?.apps?.[name]?.config?.autoscaling?.targetCPUUtilizationPercentage),
                targetMemoryUtilizationPercentage: ServiceField.string(values.autoscaling?.targetMemoryUtilizationPercentage ?? '', porterJson?.apps?.[name]?.config?.autoscaling?.targetMemoryUtilizationPercentage),
            },
            ingress: {
                enabled: ServiceField.boolean(values.ingress?.enabled ?? false, porterJson?.apps?.[name]?.config?.ingress?.enabled),
                hosts: ServiceField.string(values.ingress?.hosts?.length ? values.ingress.hosts[0] : '', porterJson?.apps?.[name]?.config?.ingress?.hosts?.length ? porterJson?.apps?.[name]?.config?.ingress?.hosts[0] : undefined),
                porterHosts: ServiceField.string(values.ingress?.porter_hosts?.length ? values.ingress.porter_hosts[0] : '', porterJson?.apps?.[name]?.config?.ingress?.porter_hosts?.length ? porterJson?.apps?.[name]?.config?.ingress?.porter_hosts[0] : undefined),
            },
            port: ServiceField.string(values.container?.port ?? '', porterJson?.apps?.[name]?.config?.container?.port),
            canDelete: porterJson?.apps?.[name] == null,
            health: {
                startupProbe:{
                    auth:{
                        enabled: ServiceField.boolean(values.health.startupProbe.auth.enabled ?? false, porterJson?.apps?.[name]?.config?.health?.startupProbe?.auth?.enabled),
                        password: ServiceField.string(values.health.startupProbe.auth.password ?? '', porterJson?.apps?.[name]?.config?.health?.startupProbe?.auth.password),
                        username: ServiceField.string(values.health.startupProbe.auth.username ?? '', porterJson?.apps?.[name]?.config?.health?.startupProbe?.auth.username)
                    },
                    enabled: ServiceField.boolean(values.health.startupProbe.enabled ?? false, porterJson?.apps?.[name]?.config?.health?.startupProbe?.enabled),
                    failureThreshold: ServiceField.string(values.health.startupProbe.failureThreshold ?? '3', porterJson?.apps?.[name]?.config?.health?.startupProbe?.failureThreshold),
                    path: ServiceField.string(values.health.startupProbe.path ?? '/startupz', porterJson?.apps?.[name]?.config?.health?.startupProbe?.path),
                    periodSeconds: ServiceField.string(values.health.startupProbe.periodSeconds ?? '5', porterJson?.apps?.[name]?.config?.health?.startupProbe?.periodSeconds),
                    scheme: ServiceField.string(values.health.startupProbe.scheme ?? 'HTTP', porterJson?.apps?.[name]?.config?.health?.startupProbe?.scheme),
                    timeoutSeconds:ServiceField.string(values.health.startupProbe.timeoutSeconds ?? '1', porterJson?.apps?.[name]?.config?.health?.startupProbe?.timeoutSeconds),
                },
                readinessProbe:{
                    auth:{
                        enabled: ServiceField.boolean(values.health.readinessProbe.auth.enabled ?? false, porterJson?.apps?.[name]?.config?.health?.readinessProbe?.auth?.enabled),
                        password: ServiceField.string(values.health.readinessProbe.auth.password ?? '', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.auth.password),
                        username: ServiceField.string(values.health.readinessProbe.auth.username ?? '', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.auth.username)
                    },
                    enabled: ServiceField.boolean(values.health.readinessProbe.enabled ?? false, porterJson?.apps?.[name]?.config?.health?.readinessProbe?.enabled),
                    failureThreshold: ServiceField.string(values.health.readinessProbe.failureThreshold ?? '3', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.failureThreshold),
                    path: ServiceField.string(values.health.readinessProbe.path ?? '/startupz', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.path),
                    periodSeconds: ServiceField.string(values.health.readinessProbe.periodSeconds ?? '5', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.periodSeconds),
                    scheme: ServiceField.string(values.health.readinessProbe.scheme ?? 'HTTP', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.scheme),
                    timeoutSeconds:ServiceField.string(values.health.readinessProbe.timeoutSeconds ?? '1', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.timeoutSeconds),
                    initialDelaySeconds: ServiceField.string(values.health.readinessProbe.initialDelaySeconds ?? '5', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.initialDelaySeconds),
                    successThreshold: ServiceField.string(values.health.readinessProbe.successThreshold ?? '1', porterJson?.apps?.[name]?.config?.health?.readinessProbe?.successThreshold),
                },
                livenessCommand:{
                    command: ServiceField.string('ls -l', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.command),
                    enabled: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.health?.livenessCommand?.enabled),
                    failureThreshold: ServiceField.string('3', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.failureThreshold),
                    initialDelaySeconds: ServiceField.string('5', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.initialDelaySeconds),
                    periodSeconds: ServiceField.string('5', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.periodSeconds),
                    timeoutSeconds: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.timeoutSeconds),
                    successThreshold: ServiceField.string('1', porterJson?.apps?.[name]?.config?.health?.livenessCommand?.successThreshold),
                },
                livenessProbe:{
                    auth:{
                        enabled: ServiceField.boolean(values.health.livenessProbe.auth.enabled ?? false, porterJson?.apps?.[name]?.config?.health?.livenessProbe?.auth?.enabled),
                        password: ServiceField.string(values.health.livenessProbe.auth.password ?? '', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.auth.password),
                        username: ServiceField.string(values.health.livenessProbe.auth.username ?? '', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.auth.username)
                    },
                    enabled: ServiceField.boolean(values.health.livenessProbe.enabled ?? false, porterJson?.apps?.[name]?.config?.health?.livenessProbe?.enabled),
                    failureThreshold: ServiceField.string(values.health.livenessProbe.failureThreshold ?? '3', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.failureThreshold),
                    path: ServiceField.string(values.health.livenessProbe.path ?? '/startupz', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.path),
                    periodSeconds: ServiceField.string(values.health.livenessProbe.periodSeconds ?? '5', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.periodSeconds),
                    scheme: ServiceField.string(values.health.livenessProbe.scheme ?? 'HTTP', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.scheme),
                    timeoutSeconds:ServiceField.string(values.health.livenessProbe.timeoutSeconds ?? '1', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.timeoutSeconds),
                    initialDelaySeconds: ServiceField.string(values.health.livenessProbe.initialDelaySeconds ?? '5', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.initialDelaySeconds),
                    successThreshold: ServiceField.string(values.health.livenessProbe.successThreshold ?? '1', porterJson?.apps?.[name]?.config?.health?.livenessProbe?.successThreshold),
                },
            }
        }
    }
}

export type JobService = SharedServiceParams & {
    type: 'job';
    jobsExecuteConcurrently: ServiceBoolean;
    cronSchedule: ServiceString;
}
const JobService = {
    default: (name: string, porterJson?: PorterJson): JobService => ({
        name,
        cpu: ServiceField.string('100', porterJson?.apps?.[name]?.config?.resources?.requests?.cpu ? porterJson?.apps?.[name]?.config?.resources?.requests?.cpu.replace('m', '') : undefined),
        ram: ServiceField.string('256', porterJson?.apps?.[name]?.config?.resources?.requests?.memory ? porterJson?.apps?.[name]?.config?.resources?.requests?.memory.replace('Mi', '') : undefined),
        startCommand: ServiceField.string('', porterJson?.apps?.[name]?.run),
        type: 'job',
        jobsExecuteConcurrently: ServiceField.boolean(false, porterJson?.apps?.[name]?.config?.allowConcurrent),
        cronSchedule: ServiceField.string('', porterJson?.apps?.[name]?.config?.schedule?.value),
        canDelete: porterJson?.apps?.[name] == null,
    }),
    serialize: (service: JobService) => {
        const schedule = service.cronSchedule.value ? {
            schedule: {
                enabled: true,
                value: service.cronSchedule.value,
            }
        } : {};
        return {
            allowConcurrent: service.jobsExecuteConcurrently.value,
            container: {
                command: service.startCommand.value,
            },
            resources: {
                requests: {
                    cpu: service.cpu.value + 'm',
                    memory: service.ram.value + 'Mi',
                }
            },
            ...schedule,
        }
    },
    deserialize: (name: string, values: any, porterJson?: PorterJson): JobService => {
        return {
            name,
            cpu: ServiceField.string(values.resources?.requests?.cpu?.replace('m', ''), porterJson?.apps?.[name]?.config?.resources?.requests?.cpu ? porterJson?.apps?.[name]?.config?.resources?.requests?.cpu.replace('m', '') : undefined),
            ram: ServiceField.string(values.resources?.requests?.memory?.replace('Mi', '') ?? '', porterJson?.apps?.[name]?.config?.resources?.requests?.memory ? porterJson?.apps?.[name]?.config?.resources?.requests?.memory.replace('Mi', '') : undefined),
            startCommand: ServiceField.string(values.container?.command ?? '', porterJson?.apps?.[name]?.run),
            type: 'job',
            jobsExecuteConcurrently: ServiceField.boolean(values.allowConcurrent ?? false, porterJson?.apps?.[name]?.config?.allowConcurrent),
            cronSchedule: ServiceField.string(values.schedule?.value ?? '', porterJson?.apps?.[name]?.config?.schedule?.value),
            canDelete: porterJson?.apps?.[name] == null,
        }
    }
}

export type ReleaseService = SharedServiceParams & {
    type: 'release';
};
const ReleaseService = {
    default: (porterJson?: PorterJson): ReleaseService => ({
        name: 'release',
        cpu: ServiceField.string('100', porterJson?.release?.config?.resources?.requests?.cpu ? porterJson?.release?.config?.resources?.requests?.cpu.replace('m', '') : undefined),
        ram: ServiceField.string('256', porterJson?.release?.config?.resources?.requests?.memory ? porterJson?.release?.config?.resources?.requests?.memory.replace('Mi', '') : undefined),
        startCommand: ServiceField.string('', porterJson?.release?.run),
        type: 'release',
        canDelete: porterJson?.release == null,
    }),

    serialize: (service: ReleaseService) => {
        return {
            container: {
                command: service.startCommand.value,
            },
            resources: {
                requests: {
                    cpu: service.cpu.value + 'm',
                    memory: service.ram.value + 'Mi',
                }
            },
            paused: true, // this makes sure the release isn't run immediately. it is flipped when the porter apply runs the release in the GHA
        }
    },

    deserialize: (name: string, values: any, porterJson?: PorterJson): ReleaseService => {
        return {
            name,
            cpu: ServiceField.string(values?.resources?.requests?.cpu?.replace('m', ''), porterJson?.release?.config?.resources?.requests?.cpu ? porterJson?.release?.config?.resources?.requests?.cpu.replace('m', '') : undefined),
            ram: ServiceField.string(values?.resources?.requests?.memory?.replace('Mi', '') ?? '', porterJson?.release?.config?.resources?.requests?.memory ? porterJson?.release?.config?.resources?.requests?.memory.replace('Mi', '') : undefined),
            startCommand: ServiceField.string(values?.container?.command ?? '', porterJson?.release?.run),
            type: 'release',
            canDelete: porterJson?.release == null,
        }
    }
}


const TYPE_TO_SUFFIX: Record<ServiceType, string> = {
    'web': '-web',
    'worker': '-wkr',
    'job': '-job',
    'release': '',
}
const SUFFIX_TO_TYPE: Record<string, ServiceType> = {
    '-web': 'web',
    '-wkr': 'worker',
    '-job': 'job',
}

export const Service = {
    // populates an empty service
    default: (name: string, type: ServiceType, porterJson?: PorterJson) => {
        switch (type) {
            case 'web':
                return WebService.default(name, porterJson);
            case 'worker':
                return WorkerService.default(name, porterJson);
            case 'job':
                return JobService.default(name, porterJson);
            case 'release':
                return ReleaseService.default(porterJson);
        }
    },

    // converts a service to a helm values object
    serialize: (service: Service) => {
        switch (service.type) {
            case 'web':
                return WebService.serialize(service);
            case 'worker':
                return WorkerService.serialize(service);
            case 'job':
                return JobService.serialize(service);
            case 'release':
                return ReleaseService.serialize(service);
        }
    },

    // converts a helm values object and porter json (from their repo) to a service
    deserialize: (helmValues: any, defaultValues: any, porterJson?: PorterJson): Service[] => {
        if (defaultValues == null) {
            return [];
        }
        return Object.keys(defaultValues).map((name: string) => {
            const suffix = name.slice(-4);
            if (suffix in SUFFIX_TO_TYPE) {
                const type = SUFFIX_TO_TYPE[suffix];
                const appName = name.slice(0, -4);
                const coalescedValues = overrideObjectValues(
                    defaultValues[name],
                    helmValues?.[name] ?? {}
                );
                switch (type) {
                    case 'web':
                        return WebService.deserialize(appName, coalescedValues, porterJson);
                    case 'worker':
                        return WorkerService.deserialize(appName, coalescedValues, porterJson);
                    case 'job':
                        return JobService.deserialize(appName, coalescedValues, porterJson);
                }
            }
        }).filter((service: Service | undefined): service is Service => service != null) as Service[];
    },
    // TODO: consolidate these
    deserializeRelease: (helmValues: any, porterJson?: PorterJson): ReleaseService => {
        return ReleaseService.deserialize('pre-deploy', helmValues, porterJson);
    },

    // standard typeguards
    isWeb: (service: Service): service is WebService => service.type === 'web',
    isWorker: (service: Service): service is WorkerService => service.type === 'worker',
    isJob: (service: Service): service is JobService => service.type === 'job',
    isRelease: (service: Service): service is ReleaseService => service.type === 'release',
    isNonRelease: (service: Service): service is Exclude<Service, ReleaseService> => service.type !== 'release',

    // required because of https://github.com/helm/helm/issues/9214
    toHelmName: (service: Service): string => {
        return service.name + TYPE_TO_SUFFIX[service.type]
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

    retrieveSubdomainFromHelmValues: (services: Service[], helmValues: any): string => {
        const webServices = services.filter(Service.isWeb);
        if (webServices.length == 0) {
            return "";
        }

        const prefixSubdomain = (subdomain: string) => {
            if (subdomain.startsWith('https://') || subdomain.startsWith('http://')) {
                return subdomain;
            }
            return 'https://' + subdomain;
        }

        for (const web of webServices) {
            const values = helmValues[Service.toHelmName(web)];
            if (values == null || values.ingress == null || !values.ingress.enabled) {
                continue;
            }
            if (values.ingress.custom_domain && values.ingress.hosts?.length > 0) {
                return prefixSubdomain(values.ingress.hosts[0]);
            }
            if (values.ingress.porter_hosts?.length > 0) {
                return prefixSubdomain(values.ingress.porter_hosts[0]);
            }
        }

        return "";
    }
}

