import convert from "convert";

export const MIB_TO_GIB = 1024;
export const MILI_TO_CORE = 1000;
interface InstanceDetails {
  vCPU: number;
  RAM: number;
}

interface InstanceTypes {
  [key: string]: {
    [size: string]: InstanceDetails;
  };
}

// use values from AWS as base constant, convert to MB
export const AWS_INSTANCE_LIMITS: InstanceTypes = Object.freeze({
  t3a: {
    nano: { vCPU: 2, RAM: Math.round(convert(0.5, "GiB").to("MB")) },
    micro: { vCPU: 2, RAM: Math.round(convert(1, "GiB").to("MB")) },
    small: { vCPU: 2, RAM: Math.round(convert(2, "GiB").to("MB")) },
    medium: { vCPU: 2, RAM: Math.round(convert(4, "GiB").to("MB")) },
    large: { vCPU: 2, RAM: Math.round(convert(8, "GiB").to("MB")) },
    xlarge: { vCPU: 4, RAM: Math.round(convert(16, "GiB").to("MB")) },
    "2xlarge": { vCPU: 8, RAM: Math.round(convert(32, "GiB").to("MB")) },
  },
  t3: {
    nano: { vCPU: 2, RAM: Math.round(convert(0.5, "GiB").to("MB")) },
    micro: { vCPU: 2, RAM: Math.round(convert(1, "GiB").to("MB")) },
    small: { vCPU: 2, RAM: Math.round(convert(2, "GiB").to("MB")) },
    medium: { vCPU: 2, RAM: Math.round(convert(4, "GiB").to("MB")) },
    large: { vCPU: 2, RAM: Math.round(convert(8, "GiB").to("MB")) },
    xlarge: { vCPU: 4, RAM: Math.round(convert(16, "GiB").to("MB")) },
    "2xlarge": { vCPU: 8, RAM: Math.round(convert(32, "GiB").to("MB")) },
  },
  t2: {
    nano: { vCPU: 1, RAM: Math.round(convert(0.5, "GiB").to("MB")) },
    micro: { vCPU: 1, RAM: Math.round(convert(1, "GiB").to("MB")) },
    small: { vCPU: 1, RAM: Math.round(convert(2, "GiB").to("MB")) },
    medium: { vCPU: 2, RAM: Math.round(convert(4, "GiB").to("MB")) },
    large: { vCPU: 2, RAM: Math.round(convert(8, "GiB").to("MB")) },
    xlarge: { vCPU: 4, RAM: Math.round(convert(16, "GiB").to("MB")) },
    "2xlarge": { vCPU: 8, RAM: Math.round(convert(32, "GiB").to("MB")) },
  },
  c6i: {
    large: { vCPU: 2, RAM: Math.round(convert(4, "GiB").to("MB")) },
    xlarge: { vCPU: 4, RAM: Math.round(convert(8, "GiB").to("MB")) },
    "2xlarge": { vCPU: 8, RAM: Math.round(convert(16, "GiB").to("MB")) },
    "4xlarge": { vCPU: 16, RAM: Math.round(convert(32, "GiB").to("MB")) },
    "8xlarge": { vCPU: 32, RAM: Math.round(convert(64, "GiB").to("MB")) },
    "12xlarge": { vCPU: 48, RAM: Math.round(convert(96, "GiB").to("MB")) },
  },
  g4dn: {
    xlarge: { vCPU: 4, RAM: Math.round(convert(16, "GiB").to("MB")) },
    "2xlarge": { vCPU: 8, RAM: Math.round(convert(32, "GiB").to("MB")) },
    "4xlarge": { vCPU: 16, RAM: Math.round(convert(64, "GiB").to("MB")) },
    "8xlarge": { vCPU: 32, RAM: Math.round(convert(128, "GiB").to("MB")) },
  },
  r6a: {
    large: { vCPU: 2, RAM: Math.round(convert(16, "GiB").to("MB")) },
    xlarge: { vCPU: 4, RAM: Math.round(convert(32, "GiB").to("MB")) },
    "2xlarge": { vCPU: 8, RAM: Math.round(convert(64, "GiB").to("MB")) },
    "4xlarge": { vCPU: 16, RAM: Math.round(convert(128, "GiB").to("MB")) },
    "8xlarge": { vCPU: 32, RAM: Math.round(convert(256, "GiB").to("MB")) },
  },
  c5: {
    large: { vCPU: 2, RAM: Math.round(convert(4, "GiB").to("MB")) },
    xlarge: { vCPU: 4, RAM: Math.round(convert(8, "GiB").to("MB")) },
    "2xlarge": { vCPU: 8, RAM: Math.round(convert(16, "GiB").to("MB")) },
    "4xlarge": { vCPU: 16, RAM: Math.round(convert(32, "GiB").to("MB")) },
  },
  m5: {
    large: { vCPU: 2, RAM: Math.round(convert(8, "GiB").to("MB")) },
    xlarge: { vCPU: 4, RAM: Math.round(convert(16, "GiB").to("MB")) },
    "2xlarge": { vCPU: 8, RAM: Math.round(convert(32, "GiB").to("MB")) },
    "4xlarge": { vCPU: 16, RAM: Math.round(convert(64, "GiB").to("MB")) },
  },
  x2gd: {
    medium: { vCPU: 1, RAM: Math.round(convert(16, "GiB").to("MB")) },
    large: { vCPU: 2, RAM: Math.round(convert(32, "GiB").to("MB")) },
    xlarge: { vCPU: 4, RAM: Math.round(convert(64, "GiB").to("MB")) },
  },
});
