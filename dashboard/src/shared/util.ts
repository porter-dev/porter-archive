import { EnumQuotaIncrease } from "@porter-dev/api-contracts";

export const isJSON = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch (err) {
    return false;
  }
};

export function valueExists<T>(value: T | null | undefined): value is T {
  return !!value;
}

export const PREFLIGHT_MESSAGE_CONST = {
  cloudFormation: "CloudFormation stack created",
};

export const PREFLIGHT_MESSAGE_CONST_AWS = {
  eip: "Elastic IP availability",
  natGateway: "NAT Gateway availability",
  vpc: "VPC availability",
  // vcpus: "vCPU availability",
};

export const PREFLIGHT_MESSAGE_CONST_GCP = {
  apiEnabled: "APIs enabled on service account",
  cidrAvailability: "CIDR availability",
  iamPermissions: "IAM permissions",
};

export const PREFLIGHT_TO_ENUM = {
  eip: EnumQuotaIncrease.AWS_EIP,
  natGateway: EnumQuotaIncrease.AWS_NAT,
  vpc: EnumQuotaIncrease.AWS_VPC,
  vcpus: EnumQuotaIncrease.AWS_VCPU,
};

export const PROVISIONING_STATUS = {
  0: "Waiting for Quota Increase",
  1: "Generating Resources",
  2: "Provisioning Cluster ",
};
