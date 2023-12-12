export const MIB_TO_GIB = 1024;
export const MILI_TO_CORE = 1000;
type InstanceDetails = {
  vCPU: number;
  RAM: number;
};

type InstanceTypes = Record<string, Record<string, InstanceDetails>>;

// use values from AWS as base constant, convert to MB
export const AWS_INSTANCE_LIMITS: InstanceTypes = Object.freeze({
  t3a: {
    nano: { vCPU: 2, RAM: 0.5 },
    micro: { vCPU: 2, RAM: 1 },
    small: { vCPU: 2, RAM: 2 },
    medium: { vCPU: 2, RAM: 4 },
    large: { vCPU: 2, RAM: 8 },
    xlarge: { vCPU: 4, RAM: 16 },
    "2xlarge": { vCPU: 8, RAM: 32 },
  },
  t3: {
    nano: { vCPU: 2, RAM: 0.5 },
    micro: { vCPU: 2, RAM: 1 },
    small: { vCPU: 2, RAM: 2 },
    medium: { vCPU: 2, RAM: 4 },
    large: { vCPU: 2, RAM: 8 },
    xlarge: { vCPU: 4, RAM: 16 },
    "2xlarge": { vCPU: 8, RAM: 32 },
  },
  t2: {
    nano: { vCPU: 1, RAM: 0.5 },
    micro: { vCPU: 1, RAM: 1 },
    small: { vCPU: 1, RAM: 2 },
    medium: { vCPU: 2, RAM: 4 },
    large: { vCPU: 2, RAM: 8 },
    xlarge: { vCPU: 4, RAM: 16 },
    "2xlarge": { vCPU: 8, RAM: 32 },
  },
  t4g: {
    nano: { vCPU: 2, RAM: 0.5 },
    micro: { vCPU: 2, RAM: 1 },
    small: { vCPU: 2, RAM: 2 },
    medium: { vCPU: 2, RAM: 4 },
    large: { vCPU: 2, RAM: 8 },
    xlarge: { vCPU: 4, RAM: 16 },
    "2xlarge": { vCPU: 8, RAM: 32 },
  },
  c6a: {
    large: { vCPU: 2, RAM: 4 },
    xlarge: { vCPU: 4, RAM: 8 },
    "2xlarge": { vCPU: 8, RAM: 16 },
    "4xlarge": { vCPU: 16, RAM: 32 },
    "8xlarge": { vCPU: 32, RAM: 64 },
  },
  c6i: {
    large: { vCPU: 2, RAM: 4 },
    xlarge: { vCPU: 4, RAM: 8 },
    "2xlarge": { vCPU: 8, RAM: 16 },
    "4xlarge": { vCPU: 16, RAM: 32 },
    "8xlarge": { vCPU: 32, RAM: 64 },
    "12xlarge": { vCPU: 48, RAM: 96 },
  },
  g4dn: {
    xlarge: { vCPU: 4, RAM: 16 },
    "2xlarge": { vCPU: 8, RAM: 32 },
    "4xlarge": { vCPU: 16, RAM: 64 },
    "8xlarge": { vCPU: 32, RAM: 128 },
  },
  r6a: {
    large: { vCPU: 2, RAM: 16 },
    xlarge: { vCPU: 4, RAM: 32 },
    "2xlarge": { vCPU: 8, RAM: 64 },
    "4xlarge": { vCPU: 16, RAM: 128 },
    "8xlarge": { vCPU: 32, RAM: 256 },
  },
  c5: {
    large: { vCPU: 2, RAM: 4 },
    xlarge: { vCPU: 4, RAM: 8 },
    "2xlarge": { vCPU: 8, RAM: 16 },
    "4xlarge": { vCPU: 16, RAM: 32 },
  },
  m5: {
    large: { vCPU: 2, RAM: 8 },
    xlarge: { vCPU: 4, RAM: 16 },
    "2xlarge": { vCPU: 8, RAM: 32 },
    "4xlarge": { vCPU: 16, RAM: 64 },
  },
  x2gd: {
    medium: { vCPU: 1, RAM: 16 },
    large: { vCPU: 2, RAM: 32 },
    xlarge: { vCPU: 4, RAM: 64 },
  },
  m5n: {
    large: { vCPU: 2, RAM: 8 },
    xlarge: { vCPU: 4, RAM: 16 },
    "2xlarge": { vCPU: 8, RAM: 32 },
    "4xlarge": { vCPU: 16, RAM: 64 },
  },
  // add GCP instance tyoes : TO DO add a dedicated section for GCP
  e2: {
    "standard-2": { vCPU: 2, RAM: 8 },
    "standard-4": { vCPU: 4, RAM: 16 },
    "standard-8": { vCPU: 8, RAM: 32 },
    "standard-16": { vCPU: 16, RAM: 64 },
    "standard-32": { vCPU: 32, RAM: 128 },
    "standard-64": { vCPU: 64, RAM: 256 },
  },
  c3: {
    "highcpu-4": { vCPU: 4, RAM: 8 },
    "highcpu-8": { vCPU: 8, RAM: 16 },
    "highcpu-22": { vCPU: 22, RAM: 44 },
    "highcpu-44": { vCPU: 44, RAM: 88 },
    "highmem-4": { vCPU: 4, RAM: 32 },
    "highmem-8": { vCPU: 8, RAM: 64 },
    "highmem-22": { vCPU: 22, RAM: 176 },
    "highmem-44": { vCPU: 44, RAM: 352 },
    "standard-4": { vCPU: 4, RAM: 16 },
    "standard-8": { vCPU: 8, RAM: 32 },
    "standard-22": { vCPU: 22, RAM: 88 },
    "standard-44": { vCPU: 44, RAM: 176 },
  },
});
