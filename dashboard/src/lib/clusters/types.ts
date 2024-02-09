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
export type AWSRegion = z.infer<typeof awsRegionValidator>;
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
export type GCPRegion = z.infer<typeof gcpRegionValidator>;
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
export type AzureRegion = z.infer<typeof azureRegionValidator>;
export type ClientRegion = {
  name: AWSRegion | GCPRegion | AzureRegion;
  displayName: string;
};
export type MachineType = {
  name: string;
  displayName: string;
  supportedRegions: ClientRegion[];
};

// Cluster
export const clusterValidator = z.object({
  id: z.number(),
  name: z.string(),
  vanity_name: z.string(),
  cloud_provider: cloudProviderValidator,
  cloud_provider_credential_identifier: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SerializedCluster = z.infer<typeof clusterValidator>;
export type ClientCluster = Omit<SerializedCluster, "cloud_provider"> & {
  cloud_provider: ClientCloudProvider;
};
export const isAWSCluster = (
  cluster: ClientCluster
): cluster is ClientCluster => {
  return cluster.cloud_provider === CloudProviderAWS;
};

// Contract
export const contractValidator = z.object({
  id: z.string(),
  base64_contract: z.string(),
  cluster_id: z.number(),
  project_id: z.number(),
  condition: z.enum([
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
  ]),
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
const eksConfigValidator = z.object({
  kind: z.literal("EKS"),
  clusterName: z.string(),
  clusterVersion: z.string(),
  region: awsRegionValidator,
  // nodeGroup: z.string(),
});
const gkeConfigValidator = z.object({
  kind: z.literal("GKE"),
  clusterName: z.string(),
  clusterVersion: z.string(),
  region: gcpRegionValidator,
});
const aksConfigValidator = z.object({
  kind: z.literal("AKS"),
  clusterName: z.string(),
  clusterVersion: z.string(),
  location: azureRegionValidator,
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
  config: clusterConfigValidator.optional(),
});
export type ClientClusterConfig = z.infer<typeof clusterConfigValidator>;
export type EKSClientClusterConfig = z.infer<typeof eksConfigValidator>;
export type GKEClientClusterConfig = z.infer<typeof gkeConfigValidator>;
export type AKSClientClusterConfig = z.infer<typeof aksConfigValidator>;
export const clusterContractValidator = z.object({
  cluster: contractClusterValidator,
});
export type ClientClusterContract = z.infer<typeof clusterContractValidator>;
