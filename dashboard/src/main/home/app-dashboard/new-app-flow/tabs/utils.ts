export const DATABASE_HEIGHT_ENABLED = 374;
export const DATABASE_HEIGHT_DISABLED = 119;
export const RESOURCE_HEIGHT_WITHOUT_AUTOSCALING = 422;
export const RESOURCE_HEIGHT_WITH_AUTOSCALING = 820;

interface InstanceDetails {
    vCPU: number;
    "Mem (GiB)": number;
}

interface InstanceTypes {
    [key: string]: {
        [size: string]: InstanceDetails;
    };
}

export const AWS_INSTANCE_LIMITS: InstanceTypes = {
    "t3a": {
        "nano": { "vCPU": 2, "Mem (GiB)": 0.5 },
        "micro": { "vCPU": 2, "Mem (GiB)": 1 },
        "small": { "vCPU": 2, "Mem (GiB)": 2 },
        "medium": { "vCPU": 2, "Mem (GiB)": 4 },
        "large": { "vCPU": 2, "Mem (GiB)": 8 },
        "xlarge": { "vCPU": 4, "Mem (GiB)": 16 },
        "2xlarge": { "vCPU": 8, "Mem (GiB)": 32 }
    },
    "t3": {
        "nano": { "vCPU": 2, "Mem (GiB)": 0.5 },
        "micro": { "vCPU": 2, "Mem (GiB)": 1 },
        "small": { "vCPU": 2, "Mem (GiB)": 2 },
        "medium": { "vCPU": 2, "Mem (GiB)": 4 },
        "large": { "vCPU": 2, "Mem (GiB)": 8 },
        "xlarge": { "vCPU": 4, "Mem (GiB)": 16 },
        "2xlarge": { "vCPU": 8, "Mem (GiB)": 32 }
    },
    "t2": {
        "nano": { "vCPU": 1, "Mem (GiB)": 0.5 },
        "micro": { "vCPU": 1, "Mem (GiB)": 1 },
        "small": { "vCPU": 1, "Mem (GiB)": 2 },
        "medium": { "vCPU": 2, "Mem (GiB)": 4 },
        "large": { "vCPU": 2, "Mem (GiB)": 8 },
        "xlarge": { "vCPU": 4, "Mem (GiB)": 16 },
        "2xlarge": { "vCPU": 8, "Mem (GiB)": 32 }
    },
    "c6i": {
        "large": { "vCPU": 2, "Mem (GiB)": 4 },
        "xlarge": { "vCPU": 4, "Mem (GiB)": 8 },
        "2xlarge": { "vCPU": 8, "Mem (GiB)": 16 },
        "4xlarge": { "vCPU": 16, "Mem (GiB)": 32 },
        "8xlarge": { "vCPU": 32, "Mem (GiB)": 64 },
        "12xlarge": { "vCPU": 48, "Mem (GiB)": 96 },
    },
    "g4dn": {
        "xlarge": { "vCPU": 4, "Mem (GiB)": 16 },
        "2xlarge": { "vCPU": 8, "Mem (GiB)": 32 },
        "4xlarge": { "vCPU": 16, "Mem (GiB)": 64 },
        "8xlarge": { "vCPU": 32, "Mem (GiB)": 128 },
    },
    "r6a": {
        "large": { "vCPU": 2, "Mem (GiB)": 16 },
        "xlarge": { "vCPU": 4, "Mem (GiB)": 32 },
        "2xlarge": { "vCPU": 8, "Mem (GiB)": 64 },
        "4xlarge": { "vCPU": 16, "Mem (GiB)": 128 },
        "8xlarge": { "vCPU": 32, "Mem (GiB)": 256 },
    },
    "c5": {
        "large": { "vCPU": 2, "Mem (GiB)": 4 },
        "xlarge": { "vCPU": 4, "Mem (GiB)": 8 },
        "2xlarge": { "vCPU": 8, "Mem (GiB)": 16 },
        "4xlarge": { "vCPU": 16, "Mem (GiB)": 32 },
    },
    "m5": {
        "large": { "vCPU": 2, "Mem (GiB)": 8 },
        "xlarge": { "vCPU": 4, "Mem (GiB)": 16 },
        "2xlarge": { "vCPU": 8, "Mem (GiB)": 32 },
        "4xlarge": { "vCPU": 16, "Mem (GiB)": 64 },
    },
    "x2gd": {
        "medium": { "vCPU": 1, "Mem (GiB)": 16 },
        "large": { "vCPU": 2, "Mem (GiB)": 32 },
        "xlarge": { "vCPU": 4, "Mem (GiB)": 64 },
    }
}