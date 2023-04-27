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
        generateUrlForExternalTraffic: true,
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
        const ingress = service.generateUrlForExternalTraffic ? {
            ingress: {
                enabled: true,
                custom_domain: service.customDomain ? true : false,
                hosts: service.customDomain ? [service.customDomain] : [],
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
            ...ingress,
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
    serialize: (service: Service) => {
        switch (service.type) {
            case 'web':
                return WebService.serialize(service);
            case 'worker':
                return WorkerService.serialize(service);
            case 'job':
                return JobService.serialize(service);
        }
    }
} 