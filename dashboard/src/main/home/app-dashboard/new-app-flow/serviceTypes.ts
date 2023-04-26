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
        cpu: '',
        ram: '',
        startCommand: startCommand,
        type: 'worker',
        replicas: '1',
        autoscalingOn: false,
        minReplicas: '1',
        maxReplicas: '10',
        targetCPUUtilizationPercentage: '50',
        targetRAMUtilizationPercentage: '50',
    }),
}

export type WebService = SharedServiceParams & Omit<WorkerService, 'type'> & {
    type: 'web';
    port: string;
    generateUrlForExternalTraffic: boolean;
    customDomain?: string;
}
const WebService = {
    default: (name: string, startCommand: ServiceReadOnlyField): WebService => ({
        name,
        cpu: '',
        ram: '',
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
    }),
}

export type JobService = SharedServiceParams & {
    type: 'job';
    jobsExecuteConcurrently: boolean;
    cronSchedule: string;
}
const JobService = {
    default: (name: string, startCommand: ServiceReadOnlyField): JobService => ({
        name,
        cpu: '',
        ram: '',
        startCommand: startCommand,
        type: 'job',
        jobsExecuteConcurrently: false,
        cronSchedule: '',
    }),
}

export const createDefaultService = (name: string, type: ServiceType, startCommand: ServiceReadOnlyField) => {
    switch (type) {
        case 'web':
            return WebService.default(name, startCommand);
        case 'worker':
            return WorkerService.default(name, startCommand);
        case 'job':
            return JobService.default(name, startCommand);
    }
}