import _ from "lodash";
import { overrideObjectValues } from "./utils";
import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";

export type Service = WorkerService | WebService | JobService;
export type ServiceType = 'web' | 'worker' | 'job';

type ServiceReadOnlyField = {
    readOnly: boolean;
    value: string;
}

type SharedServiceParams = {
    name: string;
    cpu: string;
    ram: string;
    startCommand: ServiceReadOnlyField;
    type: ServiceType;
}

export type WorkerService = SharedServiceParams & {
    type: 'worker';
    replicas: string;
    autoscalingOn: boolean;
    minReplicas: string;
    maxReplicas: string;
    targetCPUUtilizationPercentage: string;
    targetRAMUtilizationPercentage: string;
}
const WorkerService = {
    default: (name: string, startCommand: ServiceReadOnlyField): WorkerService => ({
        name,
        cpu: '100',
        ram: '256',
        startCommand: startCommand,
        type: 'worker',
        replicas: '1',
        autoscalingOn: false,
        minReplicas: '1',
        maxReplicas: '10',
        targetCPUUtilizationPercentage: '50',
        targetRAMUtilizationPercentage: '50',
    }),
    serialize: (service: WorkerService) => {
        const autoscaling = service.autoscalingOn ? {
            autoscaling: {
                enabled: true,
                minReplicas: service.minReplicas,
                maxReplicas: service.maxReplicas,
                targetCPUUtilizationPercentage: service.targetCPUUtilizationPercentage,
                targetMemoryUtilizationPercentage: service.targetRAMUtilizationPercentage,
            }
        } : {};
        return {
            replicaCount: service.replicas,
            container: {
                command: service.startCommand.value,
            },
            resources: {
                requests: {
                    cpu: service.cpu + 'm',
                    memory: service.ram + 'Mi',
                }
            },
            ...autoscaling,
        }
    },
    deserialize: (name: string, values: any): WorkerService => {
        return {
            name,
            cpu: values.resources?.requests?.cpu?.replace('m', '') ?? '',
            ram: values.resources?.requests?.memory?.replace('Mi', '') ?? '',
            startCommand: {
                readOnly: false,
                value: values.container?.command ?? '',
            },
            type: 'worker',
            replicas: values.replicaCount ?? '',
            autoscalingOn: values.autoscaling?.enabled ?? false,
            minReplicas: values.autoscaling?.minReplicas ?? '',
            maxReplicas: values.autoscaling?.maxReplicas ?? '',
            targetCPUUtilizationPercentage: values.autoscaling?.targetCPUUtilizationPercentage ?? '',
            targetRAMUtilizationPercentage: values.autoscaling?.targetMemoryUtilizationPercentage ?? '',
        }
    }
}

export type WebService = SharedServiceParams & Omit<WorkerService, 'type'> & {
    type: 'web';
    port: string;
    generateUrlForExternalTraffic: boolean;
    customDomain: string;
}
const WebService = {
    default: (name: string, startCommand: ServiceReadOnlyField): WebService => ({
        name,
        cpu: '100',
        ram: '256',
        startCommand: startCommand,
        type: 'web',
        replicas: '1',
        autoscalingOn: false,
        minReplicas: '1',
        maxReplicas: '10',
        targetCPUUtilizationPercentage: '50',
        targetRAMUtilizationPercentage: '50',
        port: '80',
        generateUrlForExternalTraffic: false,
        customDomain: '',
    }),
    serialize: (service: WebService) => {
        const autoscaling = service.autoscalingOn ? {
            autoscaling: {
                enabled: true,
                minReplicas: service.minReplicas,
                maxReplicas: service.maxReplicas,
                targetCPUUtilizationPercentage: service.targetCPUUtilizationPercentage,
                targetMemoryUtilizationPercentage: service.targetRAMUtilizationPercentage,
            }
        } : {};
        return {
            replicaCount: service.replicas,
            resources: {
                requests: {
                    cpu: service.cpu + 'm',
                    memory: service.ram + 'Mi',
                }
            },
            container: {
                command: service.startCommand.value,
                port: service.port,
            },
            service: {
                port: service.port,
            },
            ...autoscaling,
        }
    },
    deserialize: (name: string, values: any): WebService => {
        return {
            name,
            cpu: values.resources?.requests?.cpu?.replace('m', '') ?? '',
            ram: values.resources?.requests?.memory?.replace('Mi', '') ?? '',
            startCommand: {
                readOnly: false,
                value: values.container?.command ?? ''
            },
            type: 'web',
            replicas: values.replicaCount ?? '',
            autoscalingOn: values.autoscaling?.enabled ?? false,
            minReplicas: values.autoscaling?.minReplicas ?? '',
            maxReplicas: values.autoscaling?.maxReplicas ?? '',
            targetCPUUtilizationPercentage: values.autoscaling?.targetCPUUtilizationPercentage ?? '',
            targetRAMUtilizationPercentage: values.autoscaling?.targetMemoryUtilizationPercentage ?? '',
            port: values.container?.port ?? '',
            generateUrlForExternalTraffic: values.ingress?.enabled ?? false,
            customDomain: values.ingress?.hosts?.length ? values.ingress.hosts[0] : '',
        }
    }
}

export type JobService = SharedServiceParams & {
    type: 'job';
    jobsExecuteConcurrently: boolean;
    cronSchedule: string;
}
const JobService = {
    default: (name: string, startCommand: ServiceReadOnlyField): JobService => ({
        name,
        cpu: '100',
        ram: '256',
        startCommand: startCommand,
        type: 'job',
        jobsExecuteConcurrently: false,
        cronSchedule: '',
    }),
    serialize: (service: JobService) => {
        const schedule = service.cronSchedule ? {
            enabled: true,
            value: service.cronSchedule,
        } : {};
        return {
            allowConcurrent: service.jobsExecuteConcurrently,
            container: {
                command: service.startCommand.value,
            },
            resources: {
                requests: {
                    cpu: service.cpu + 'm',
                    memory: service.ram + 'Mi',
                }
            },
            ...schedule,
        }
    },
    deserialize: (name: string, values: any): JobService => {
        return {
            name,
            cpu: values.resources?.requests?.cpu?.replace('m', '') ?? '',
            ram: values.resources?.requests?.memory?.replace('Mi', '') ?? '',
            startCommand: {
                readOnly: false,
                value: values.container?.command ?? ''
            },
            type: 'job',
            jobsExecuteConcurrently: values.allowConcurrent ?? false,
            cronSchedule: values.schedule?.value ?? '',
        }
    }
}

const TYPE_TO_SUFFIX: Record<ServiceType, string> = {
    'web': '-web',
    'worker': '-wkr',
    'job': '-job',
}
const SUFFIX_TO_TYPE: Record<string, ServiceType> = {
    '-web': 'web',
    '-wkr': 'worker',
    '-job': 'job',
}

export const Service = {
    // populates an empty service
    default: (name: string, type: ServiceType, startCommand: ServiceReadOnlyField) => {
        switch (type) {
            case 'web':
                return WebService.default(name, startCommand);
            case 'worker':
                return WorkerService.default(name, startCommand);
            case 'job':
                return JobService.default(name, startCommand);
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
        }
    },

    // converts a helm values object to a service
    deserialize: (helmValues: any, defaultValues: any): Service[] => {
        return Object.keys(defaultValues).map((name: string) => {
            const suffix = name.slice(-4);
            if (suffix in SUFFIX_TO_TYPE) {
                const type = SUFFIX_TO_TYPE[suffix];
                const appName = name.slice(0, -4);
                const coalescedValues = overrideObjectValues(
                    defaultValues[name],
                    helmValues[name] ?? {}
                );
                switch (type) {
                    case 'web':
                        return WebService.deserialize(appName, coalescedValues);
                    case 'worker':
                        return WorkerService.deserialize(appName, coalescedValues);
                    case 'job':
                        return JobService.deserialize(appName, coalescedValues);
                }
            }
        }).filter((service: Service | undefined): service is Service => service != null);
    },

    // standard typeguards
    isWeb: (service: Service): service is WebService => service.type === 'web',
    isWorker: (service: Service): service is WorkerService => service.type === 'worker',
    isJob: (service: Service): service is JobService => service.type === 'job',

    // augments ingress of a web service, will be phased out
    handleWebIngress: (service: WebService, stackName: string, projectId?: number, clusterId?: number) => {
        if (projectId == null || clusterId == null) {
            throw new Error('Project ID and Cluster ID must be provided to handle web ingress');
        }
        if (!service.generateUrlForExternalTraffic) {
            return {}
        }
        const ingress: Ingress = {
            enabled: true,
            hosts: [],
            custom_domain: false,
            porter_hosts: [],
        };
        if (service.customDomain) {
            ingress.hosts.push(service.customDomain);
            ingress.custom_domain = true;
        } else {
            // const res = await api
            //     .createSubdomain(
            //         "<token>",
            //         {},
            //         {
            //             id: projectId,
            //             cluster_id: clusterId,
            //             release_name: stackName,
            //             namespace: `porter-stack-${stackName}`,
            //         }
            //     )
            // if (res == null || res.data == null || res.data.external_url == null) {
            //     throw new Error('Failed to create subdomain for web service');
            // }
            // ingress.porter_hosts.push(res.data.external_url)
            throw new Error('Generating external URLs without custom subdomains not yet supported!');
        }

        return ingress;
    },

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
        return Object.keys(env).map((key: string) => ({
            key,
            value: env[key],
            hidden: false,
            locked: false,
            deleted: false,
        }));
    }
}

type Ingress = {
    enabled: boolean;
    hosts: string[];
    custom_domain: boolean;
    porter_hosts: string[];
}