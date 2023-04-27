import api from "shared/api";

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
            resources: {
                requests: {
                    cpu: service.cpu + 'm',
                    memory: service.ram + 'Mi',
                }
            },
            ...autoscaling,
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
                port: service.port,
            },
            service: {
                port: service.port,
            },
            ...autoscaling,
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
            resources: {
                requests: {
                    cpu: service.cpu + 'm',
                    memory: service.ram + 'Mi',
                }
            },
            ...schedule,
        }
    }
}

export const Service = {
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
    serialize: async (service: Service) => {
        switch (service.type) {
            case 'web':
                return await WebService.serialize(service);
            case 'worker':
                return WorkerService.serialize(service);
            case 'job':
                return JobService.serialize(service);
        }
    },
    isWeb: (service: Service): service is WebService => service.type === 'web',
    isWorker: (service: Service): service is WorkerService => service.type === 'worker',
    isJob: (service: Service): service is JobService => service.type === 'job',
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
    }
}

type Ingress = {
    enabled: boolean;
    hosts: string[];
    custom_domain: boolean;
    porter_hosts: string[];
}