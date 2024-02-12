import { z } from "zod";

import { checkGroupValidator } from "main/home/compliance-dashboard/types";

import { CloudProviderAWS } from "./constants";

// Cloud
const cloudProviderValidator = z.enum(["AWS", "GCP", "Azure", "Local"]);
export type CloudProvider = z.infer<typeof cloudProviderValidator>;
export type ClientCloudProvider = {
  name: CloudProvider;
  displayName: string;
  icon: string;
  regions: ClientRegion[];
  machineTypes: MachineType[];
  baseCost: number;
};
const awsRegionValidator = z.enum([
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-northeast-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ca-central-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-south-1",
  "eu-west-3",
  "eu-north-1",
  "me-south-1",
  "sa-east-1",
]);
type AWSRegion = z.infer<typeof awsRegionValidator>;
const gcpRegionValidator = z.enum([
  "us-east1",
  "us-east4",
  "us-central1",
  "europe-north1",
  "europe-central2",
  "europe-west1",
  "europe-west2",
  "europe-west6",
  "asia-south1",
  "us-west1",
  "us-west2",
  "us-west3",
  "us-west4",
]);
type GCPRegion = z.infer<typeof gcpRegionValidator>;
const azureRegionValidator = z.enum([
  "australiaeast",
  "brazilsouth",
  "canadacentral",
  "centralindia",
  "centralus",
  "eastasia",
  "eastus",
  "eastus2",
  "francecentral",
  "northeurope",
  "norwayeast",
  "southafricanorth",
  "southcentralus",
  "swedencentral",
  "switzerlandnorth",
  "uaenorth",
  "uksouth",
  "westeurope",
  "westus2",
  "westus3",
]);
type AzureRegion = z.infer<typeof azureRegionValidator>;
export type ClientRegion = {
  name: AWSRegion | GCPRegion | AzureRegion;
  displayName: string;
};
const awsMachineTypeValidator = z.enum([
  "t3.medium",
  "t3.large",
  "t3.xlarge",
  "t3.2xlarge",
  "t3a.medium",
  "t3a.large",
  "t3a.xlarge",
  "t3a.2xlarge",
  "t4g.medium",
  "t4g.large",
  "t4g.xlarge",
  "t4g.2xlarge",
  "c6i.large",
  "c6i.xlarge",
  "c6i.2xlarge",
  "c6i.4xlarge",
  "c6i.8xlarge",
  "c6a.large",
  "c6a.2xlarge",
  "c6a.4xlarge",
  "c6a.8xlarge",
  "r6i.large",
  "r6i.xlarge",
  "r6i.2xlarge",
  "r6i.4xlarge",
  "r6i.8xlarge",
  "r6i.12xlarge",
  "r6i.16xlarge",
  "r6i.24xlarge",
  "r6i.32xlarge",
  "m5n.large",
  "m5n.xlarge",
  "m5n.2xlarge",
  "m6a.large",
  "m6a.xlarge",
  "m6a.2xlarge",
  "m6a.4xlarge",
  "m6a.8xlarge",
  "m6a.12xlarge",
  "m7a.medium",
  "m7a.large",
  "m7a.xlarge",
  "m7a.2xlarge",
  "m7a.4xlarge",
  "m7a.8xlarge",
  "m7a.12xlarge",
  "m7a.16xlarge",
  "m7a.24xlarge",
  "m7i.large",
  "m7i.xlarge",
  "m7i.2xlarge",
  "m7i.4xlarge",
  "m7i.8xlarge",
  "m7i.12xlarge",
  "c7a.medium",
  "c7a.large",
  "c7a.xlarge",
  "c7a.2xlarge",
  "c7a.4xlarge",
  "c7a.8xlarge",
  "c7a.12xlarge",
  "c7a.16xlarge",
  "c7a.24xlarge",
]);
type AWSMachineType = z.infer<typeof awsMachineTypeValidator>;
const gcpMachineTypeValidator = z.enum([
  "e2-standard-2",
  "e2-standard-4",
  "e2-standard-8",
  "e2-standard-16",
  "e2-standard-32",
  "c3-standard-4",
  "c3-standard-8",
  "c3-standard-22",
  "c3-standard-44",
  "c3-highcpu-4",
  "c3-highcpu-8",
  "c3-highcpu-22",
  "c3-highcpu-44",
  "c3-highmem-4",
  "c3-highmem-8",
  "c3-highmem-22",
  "c3-highmem-44",
  "n1-standard-1",
  "n1-standard-2",
  "n1-standard-4",
  "n1-standard-8",
  "n1-standard-16",
  "n1-standard-32",
  "n1-highmem-2",
  "n1-highmem-4",
  "n1-highmem-8",
  "n1-highmem-16",
  "n1-highmem-32",
  "n1-highcpu-8",
  "n1-highcpu-16",
  "n1-highcpu-32",
]);
type GCPMachineType = z.infer<typeof gcpMachineTypeValidator>;
const azureMachineTypeValidator = z.enum([
  "Standard_B2als_v2",
  "Standard_B2as_v2",
  "Standard_A2_v2",
  "Standard_A4_v2",
  "Standard_DS1_v2",
  "Standard_DS2_v2",
  "Standard_D2ads_v5",
  "Standard_B4als_v2",
  "Standard_NC4as_T4_v3",
  "Standard_NC8as_T4_v3",
  "Standard_NC16as_T4_v3",
  "Standard_NC64as_T4_v3",
  "Standard_D8s_v3",
]);
type AzureMachineType = z.infer<typeof azureMachineTypeValidator>;
export type MachineType = {
  name: AWSMachineType | GCPMachineType | AzureMachineType;
  displayName: string;
  supportedRegions: Array<AWSRegion | GCPRegion | AzureRegion>;
};

// Cluster
export const clusterValidator = z.object({
  id: z.number(),
  name: z.string(),
  vanity_name: z.string(),
  cloud_provider: cloudProviderValidator,
  cloud_provider_credential_identifier: z.string(),
  status: z.string(),
});
export type SerializedCluster = z.infer<typeof clusterValidator>;
export type ClientCluster = Omit<SerializedCluster, "cloud_provider"> & {
  cloud_provider: ClientCloudProvider;
  contract: APIContract & {
    config: ClientClusterContract;
  };
  state?: ClusterState;
};
export const isAWSCluster = (
  cluster: ClientCluster
): cluster is ClientCluster => {
  return cluster.cloud_provider === CloudProviderAWS;
};
export const clusterStateValidator = z.object({
  phase: z.string(),
  is_infrastructure_ready: z.boolean(),
  is_control_plane_ready: z.boolean(),
});
export type ClusterState = z.infer<typeof clusterStateValidator>;

// Contract
const contractConditionValidator = z.enum([
  "",
  "QUOTA_REQUEST_FAILED",
  "RETRYING_TOO_LONG",
  "KUBE_APPLY_FAILED",
  "FATAL_PROVISIONING_ERROR",
  "ERROR_READING_MSG",
  "MSG_CAUSED_PANIC",
  "SUCCESS",
  "DELETING",
  "DELETED",
  "COMPLIANCE_CHECK_FAILED",
]);
export type ContractCondition = z.infer<typeof contractConditionValidator>;
export const contractValidator = z.object({
  id: z.string(),
  base64_contract: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  cluster_id: z.number(),
  project_id: z.number(),
  condition: contractConditionValidator,
  condition_metadata: z
    .discriminatedUnion("code", [
      z.object({
        code: z.literal("SUCCESS"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("COMPLIANCE_CHECK_FAILED"),
        message: z.string().optional(),
        metadata: z.object({
          check_groups: z.array(checkGroupValidator),
        }),
      }),
      // all other codes are just "code" and "message"
      z.object({
        code: z.literal("QUOTA_REQUEST_FAILED"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("RETRYING_TOO_LONG"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("KUBE_APPLY_FAILED"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("FATAL_PROVISIONING_ERROR"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("ERROR_READING_MSG"),
        message: z.string().optional(),
      }),
      z.object({
        code: z.literal("MSG_CAUSED_PANIC"),
        message: z.string().optional(),
      }),
    ])
    .nullable()
    .or(
      z.object({}).transform(() => ({
        code: "SUCCESS",
        message: "",
      }))
    ),
});
// this is the type of the object that is returned from the getContract API, but only the base64_contract field is editable by the user
export type APIContract = z.infer<typeof contractValidator>;
const eksNodeGroupTypeValidator = z.enum([
  "UNKNOWN",
  "SYSTEM",
  "MONITORING",
  "APPLICATION",
  "CUSTOM",
]);
const gkeNodeGroupTypeValidator = z.enum([
  "UNKNOWN",
  "SYSTEM",
  "MONITORING",
  "APPLICATION",
  "CUSTOM",
]);
const eksNodeGroupValidator = z.object({
  instanceType: z.string(),
  minInstances: z.number(),
  maxInstances: z.number(),
  nodeGroupType: eksNodeGroupTypeValidator,
});
const gkeNodeGroupValidator = z.object({
  instanceType: z.string(),
  minInstances: z.number(),
  maxInstances: z.number(),
  nodeGroupType: gkeNodeGroupTypeValidator,
});
const aksNodeGroupTypeValidator = z.enum([
  "UNKNOWN",
  "SYSTEM",
  "MONITORING",
  "APPLICATION",
  "CUSTOM",
]);
const aksNodeGroupValidator = z.object({
  instanceType: z.string(),
  minInstances: z.number(),
  maxInstances: z.number(),
  nodeGroupType: aksNodeGroupTypeValidator,
});

const eksConfigValidator = z.object({
  kind: z.literal("EKS"),
  clusterName: z.string(),
  clusterVersion: z.string(),
  region: z.string(),
  nodeGroups: eksNodeGroupValidator.array(),
  cidrRange: z.string(),
});
const gkeConfigValidator = z.object({
  kind: z.literal("GKE"),
  clusterName: z.string(),
  clusterVersion: z.string(),
  region: z.string(),
  nodeGroups: gkeNodeGroupValidator.array(),
  cidrRange: z.string(),
});
const aksConfigValidator = z.object({
  kind: z.literal("AKS"),
  clusterName: z.string(),
  clusterVersion: z.string(),
  region: z.string(),
  nodeGroups: aksNodeGroupValidator.array(),
  skuTier: z.enum(["UNKNOWN", "FREE", "STANDARD"]),
  cidrRange: z.string(),
});
const clusterConfigValidator = z.discriminatedUnion("kind", [
  eksConfigValidator,
  gkeConfigValidator,
  aksConfigValidator,
]);

const contractClusterValidator = z.object({
  projectId: z.number(),
  clusterId: z.number(),
  cloudProvider: cloudProviderValidator,
  cloudProviderCredentialsId: z.string(),
  config: clusterConfigValidator,
});
export type ClientClusterConfig = z.infer<typeof clusterConfigValidator>;
export type EKSClientClusterConfig = z.infer<typeof eksConfigValidator>;
export type GKEClientClusterConfig = z.infer<typeof gkeConfigValidator>;
export type AKSClientClusterConfig = z.infer<typeof aksConfigValidator>;
export const clusterContractValidator = z.object({
  cluster: contractClusterValidator,
});
export type ClientClusterContract = z.infer<typeof clusterContractValidator>;
