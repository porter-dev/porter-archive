import { z } from "zod";

import { checkGroupValidator } from "main/home/compliance-dashboard/types";

import { CloudProviderAWS } from "./constants";

export type CloudProvider = {
  name: SerializedCluster["cloud_provider"];
  displayName: string;
  icon: string;
};

export const clusterValidator = z.object({
  id: z.number(),
  name: z.string(),
  vanity_name: z.string(),
  cloud_provider: z.enum(["AWS", "GCP", "Azure", "Local"]),
  cloud_provider_credential_identifier: z.string(),
  status: z.string(),
  // created_at: z.string(),
  // updated_at: z.string(),
});
export type SerializedCluster = z.infer<typeof clusterValidator>;
export type ClientCluster = Omit<SerializedCluster, "cloud_provider"> & {
  cloud_provider: CloudProvider;
};
export const isAWSCluster = (
  cluster: ClientCluster
): cluster is ClientCluster => {
  return cluster.cloud_provider === CloudProviderAWS;
};

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
export type APIContract = z.infer<typeof contractValidator>;
