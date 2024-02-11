import {
  EnumCloudProvider,
  GKENodePoolType,
  NodeGroupType,
  NodePoolType,
  type Contract,
} from "@porter-dev/api-contracts";
import { match } from "ts-pattern";

import { type ClientClusterContract } from "./types";

// export function clientClusterContractToProto(
//   clientClusterContract: ClientClusterContract
// ): Cluster {
//   return new Cluster({
//     id: clientCluster.id,
//     name: clientCluster.name,
//     cloudProvider: clientCluster.cloud_provider,
//     region: clientCluster.region,
//     kubernetesKind: clientCluster.kubernetes_kind,
//     metadata: clientCluster.metadata,
//   });
// }

export function clientClusterContractFromProto(
  contract: Contract
): ClientClusterContract | undefined {
  const contractCluster = contract.cluster;
  if (!contractCluster) {
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
        .with({ case: undefined }, () => undefined)
        .exhaustive(),
    },
  };
}
