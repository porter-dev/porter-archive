import {
  Cluster,
  EnumCloudProvider,
  GKENodePoolType,
  NodeGroupType,
  NodePoolType,
  type Contract,
} from "@porter-dev/api-contracts";
import { match } from "ts-pattern";

import { type ClientClusterContract } from "./types";

// this method takes in an existing contract, applies all the changes from the client contract, and returns a new contract
// all non-editable fields should be spread from the existing contract
export function updateExistingClusterContract(
  clientClusterContract: ClientClusterContract,
  existingContract: Cluster
): Cluster {
  return match(clientClusterContract.cluster)
    .with(
      { config: { kind: "EKS" } },
      (cluster) =>
        new Cluster({
          ...existingContract,
          kindValues: {
            case: "eksKind",
            value: {
              ...existingContract.kindValues.value,
              region: cluster.config.region,
              nodeGroups: cluster.config.nodeGroups.map((ng) => {
                return {
                  instanceType: ng.instanceType,
                  minInstances: ng.minInstances,
                  maxInstances: ng.maxInstances,
                  nodeGroupType: match(ng.nodeGroupType)
                    .with("UNKNOWN", () => NodeGroupType.UNSPECIFIED)
                    .with("SYSTEM", () => NodeGroupType.UNSPECIFIED)
                    .with("MONITORING", () => NodeGroupType.MONITORING)
                    .with("APPLICATION", () => NodeGroupType.APPLICATION)
                    .with("CUSTOM", () => NodeGroupType.CUSTOM)
                    .otherwise(() => NodeGroupType.UNSPECIFIED),
                };
              }),
            },
          },
        })
    )
    .with(
      { config: { kind: "GKE" } },
      (cluster) =>
        new Cluster({
          ...existingContract,
          kindValues: {
            case: "gkeKind",
            value: {
              ...existingContract.kindValues.value,
              nodePools: cluster.config.nodeGroups.map((ng) => {
                return {
                  instanceType: ng.instanceType,
                  minInstances: ng.minInstances,
                  maxInstances: ng.maxInstances,
                  nodePoolType: match(ng.nodeGroupType)
                    .with(
                      "UNKNOWN",
                      () => GKENodePoolType.GKE_NODE_POOL_TYPE_UNSPECIFIED
                    )
                    .with(
                      "SYSTEM",
                      () => GKENodePoolType.GKE_NODE_POOL_TYPE_SYSTEM
                    )
                    .with(
                      "MONITORING",
                      () => GKENodePoolType.GKE_NODE_POOL_TYPE_MONITORING
                    )
                    .with(
                      "APPLICATION",
                      () => GKENodePoolType.GKE_NODE_POOL_TYPE_APPLICATION
                    )
                    .with(
                      "CUSTOM",
                      () => GKENodePoolType.GKE_NODE_POOL_TYPE_CUSTOM
                    )
                    .otherwise(
                      () => GKENodePoolType.GKE_NODE_POOL_TYPE_UNSPECIFIED
                    ),
                };
              }),
            },
          },
        })
    )
    .with(
      { config: { kind: "AKS" } },
      (cluster) =>
        new Cluster({
          ...existingContract,
          kindValues: {
            case: "aksKind",
            value: {
              ...existingContract.kindValues.value,
              nodePools: cluster.config.nodeGroups.map((ng) => {
                return {
                  instanceType: ng.instanceType,
                  minInstances: ng.minInstances,
                  maxInstances: ng.maxInstances,
                  nodePoolType: match(ng.nodeGroupType)
                    .with("UNKNOWN", () => NodePoolType.UNSPECIFIED)
                    .with("SYSTEM", () => NodePoolType.SYSTEM)
                    .with("MONITORING", () => NodePoolType.MONITORING)
                    .with("APPLICATION", () => NodePoolType.APPLICATION)
                    .with("CUSTOM", () => NodePoolType.CUSTOM)
                    .otherwise(() => NodePoolType.UNSPECIFIED),
                };
              }),
            },
          },
        })
    )
    .exhaustive();
}

export function clientClusterContractFromProto(
  contract: Contract
): ClientClusterContract | undefined {
  const contractCluster = contract.cluster;
  if (!contractCluster?.kindValues?.case) {
    return undefined;
  }
  return {
    cluster: {
      projectId: contractCluster.projectId,
      clusterId: contractCluster.clusterId,
      cloudProvider: match(contractCluster.cloudProvider)
        .with(EnumCloudProvider.AWS, () => "AWS" as const)
        .with(EnumCloudProvider.GCP, () => "GCP" as const)
        .with(EnumCloudProvider.AZURE, () => "Azure" as const)
        .otherwise(() => "Local" as const),
      cloudProviderCredentialsId: contractCluster.cloudProviderCredentialsId,
      config: match(contractCluster.kindValues)
        .with({ case: "eksKind" }, ({ value }) => ({
          kind: "EKS" as const,
          clusterName: value.clusterName,
          clusterVersion: value.clusterVersion,
          region: value.region,
          nodeGroups: value.nodeGroups.map((ng) => {
            return {
              instanceType: ng.instanceType,
              minInstances: ng.minInstances,
              maxInstances: ng.maxInstances,
              nodeGroupType: match(ng.nodeGroupType)
                .with(NodeGroupType.UNSPECIFIED, () => "UNKNOWN" as const)
                .with(NodeGroupType.UNSPECIFIED, () => "SYSTEM" as const)
                .with(NodeGroupType.MONITORING, () => "MONITORING" as const)
                .with(NodeGroupType.APPLICATION, () => "APPLICATION" as const)
                .with(NodeGroupType.CUSTOM, () => "CUSTOM" as const)
                .otherwise(() => "UNKNOWN" as const),
            };
          }),
        }))
        .with({ case: "gkeKind" }, ({ value }) => ({
          kind: "GKE" as const,
          clusterName: value.clusterName,
          clusterVersion: value.clusterVersion,
          region: value.region,
          nodeGroups: value.nodePools.map((ng) => {
            return {
              instanceType: ng.instanceType,
              minInstances: ng.minInstances,
              maxInstances: ng.maxInstances,
              nodeGroupType: match(ng.nodePoolType)
                .with(
                  GKENodePoolType.GKE_NODE_POOL_TYPE_UNSPECIFIED,
                  () => "UNKNOWN" as const
                )
                .with(
                  GKENodePoolType.GKE_NODE_POOL_TYPE_SYSTEM,
                  () => "SYSTEM" as const
                )
                .with(
                  GKENodePoolType.GKE_NODE_POOL_TYPE_MONITORING,
                  () => "MONITORING" as const
                )
                .with(
                  GKENodePoolType.GKE_NODE_POOL_TYPE_APPLICATION,
                  () => "APPLICATION" as const
                )
                .with(
                  GKENodePoolType.GKE_NODE_POOL_TYPE_CUSTOM,
                  () => "CUSTOM" as const
                )
                .otherwise(() => "UNKNOWN" as const),
            };
          }),
        }))
        .with({ case: "aksKind" }, ({ value }) => ({
          kind: "AKS" as const,
          clusterName: value.clusterName,
          clusterVersion: value.clusterVersion,
          region: value.location,
          nodeGroups: value.nodePools.map((ng) => {
            return {
              instanceType: ng.instanceType,
              minInstances: ng.minInstances,
              maxInstances: ng.maxInstances,
              nodeGroupType: match(ng.nodePoolType)
                .with(NodePoolType.UNSPECIFIED, () => "UNKNOWN" as const)
                .with(NodePoolType.SYSTEM, () => "SYSTEM" as const)
                .with(NodePoolType.MONITORING, () => "MONITORING" as const)
                .with(NodePoolType.APPLICATION, () => "APPLICATION" as const)
                .with(NodePoolType.CUSTOM, () => "CUSTOM" as const)
                .otherwise(() => "UNKNOWN" as const),
            };
          }),
        }))
        .exhaustive(),
    },
  };
}
