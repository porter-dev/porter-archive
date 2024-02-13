import {
  AKS,
  AKSNodePool,
  AksSkuTier,
  AWSClusterNetwork,
  Cluster,
  EKS,
  EKSNodeGroup,
  EnumCloudProvider,
  GKE,
  GKENetwork,
  GKENodePool,
  GKENodePoolType,
  NodeGroupType,
  NodePoolType,
  type Contract,
} from "@porter-dev/api-contracts";
import { match } from "ts-pattern";

import {
  type AKSClientClusterConfig,
  type ClientClusterContract,
  type EKSClientClusterConfig,
  type GKEClientClusterConfig,
} from "./types";

// this method takes in an existing contract, applies all the changes from the client contract, and returns a new contract
// all non-editable fields should be spread from the existing contract
export function updateExistingClusterContract(
  clientClusterContract: ClientClusterContract,
  existingContract: Cluster
): Cluster {
  const cluster = new Cluster({
    ...existingContract,
    cloudProviderCredentialsId:
      clientClusterContract.cluster.cloudProviderCredentialsId,
    projectId: clientClusterContract.cluster.projectId,
  });
  match(clientClusterContract.cluster.config)
    .with({ kind: "EKS" }, (config) => {
      if (cluster.kindValues.case !== "eksKind") {
        throw new Error("Invalid kind value for EKS");
      }
      cluster.kindValues.value = updateEKSKindValues(
        config,
        cluster.kindValues.value
      );
    })
    .with({ kind: "GKE" }, (config) => {
      if (cluster.kindValues.case !== "gkeKind") {
        throw new Error("Invalid kind value for GKE");
      }
      cluster.kindValues.value = updateGKEKindValues(
        config,
        cluster.kindValues.value
      );
    })
    .with({ kind: "AKS" }, (config) => {
      if (cluster.kindValues.case !== "aksKind") {
        throw new Error("Invalid kind value for AKS");
      }
      cluster.kindValues.value = updateAKSKindValues(
        config,
        cluster.kindValues.value
      );
    });

  return cluster;
}

function updateEKSKindValues(
  clientConfig: EKSClientClusterConfig,
  existingConfig: EKS
): EKS {
  return new EKS({
    ...existingConfig,
    clusterName: clientConfig.clusterName,
    region: clientConfig.region,
    nodeGroups: clientConfig.nodeGroups.map((ng) => {
      return new EKSNodeGroup({
        instanceType: ng.instanceType,
        minInstances: ng.minInstances,
        maxInstances: ng.maxInstances,
        nodeGroupType: match(ng.nodeGroupType)
          .with("UNKNOWN", () => NodeGroupType.UNSPECIFIED)
          .with("SYSTEM", () => NodeGroupType.SYSTEM)
          .with("MONITORING", () => NodeGroupType.MONITORING)
          .with("APPLICATION", () => NodeGroupType.APPLICATION)
          .with("CUSTOM", () => NodeGroupType.CUSTOM)
          .otherwise(() => NodeGroupType.UNSPECIFIED),
      });
    }),
    network: new AWSClusterNetwork({
      ...(existingConfig?.network ?? {}),
      vpcCidr: clientConfig.cidrRange,
    }),
  });
}

function updateGKEKindValues(
  clientConfig: GKEClientClusterConfig,
  existingConfig: GKE
): GKE {
  return new GKE({
    ...existingConfig,
    clusterName: clientConfig.clusterName,
    region: clientConfig.region,
    nodePools: clientConfig.nodeGroups.map((ng) => {
      return new GKENodePool({
        instanceType: ng.instanceType,
        minInstances: ng.minInstances,
        maxInstances: ng.maxInstances,
        nodePoolType: match(ng.nodeGroupType)
          .with("UNKNOWN", () => GKENodePoolType.GKE_NODE_POOL_TYPE_UNSPECIFIED)
          .with("SYSTEM", () => GKENodePoolType.GKE_NODE_POOL_TYPE_SYSTEM)
          .with(
            "MONITORING",
            () => GKENodePoolType.GKE_NODE_POOL_TYPE_MONITORING
          )
          .with(
            "APPLICATION",
            () => GKENodePoolType.GKE_NODE_POOL_TYPE_APPLICATION
          )
          .with("CUSTOM", () => GKENodePoolType.GKE_NODE_POOL_TYPE_CUSTOM)
          .otherwise(() => GKENodePoolType.GKE_NODE_POOL_TYPE_UNSPECIFIED),
      });
    }),
    network: new GKENetwork({
      ...(existingConfig?.network ?? {}),
      cidrRange: clientConfig.cidrRange,
    }),
  });
}

function updateAKSKindValues(
  clientConfig: AKSClientClusterConfig,
  existingConfig: AKS
): AKS {
  return new AKS({
    ...existingConfig,
    clusterName: clientConfig.clusterName,
    location: clientConfig.region,
    nodePools: clientConfig.nodeGroups.map((ng) => {
      return new AKSNodePool({
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
      });
    }),
    skuTier: match(clientConfig.skuTier)
      .with("FREE", () => AksSkuTier.FREE)
      .with("STANDARD", () => AksSkuTier.STANDARD)
      .otherwise(() => AksSkuTier.UNSPECIFIED),
    cidrRange: clientConfig.cidrRange,
  });
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
                .with(NodeGroupType.SYSTEM, () => "SYSTEM" as const)
                .with(NodeGroupType.MONITORING, () => "MONITORING" as const)
                .with(NodeGroupType.APPLICATION, () => "APPLICATION" as const)
                .with(NodeGroupType.CUSTOM, () => "CUSTOM" as const)
                .otherwise(() => "UNKNOWN" as const),
            };
          }),
          cidrRange: value.network?.vpcCidr ?? value.cidrRange ?? "", // network will always be provided in one of those fields
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
          cidrRange: value.network?.cidrRange ?? "", // network will always be provided
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
          skuTier: match(value.skuTier)
            .with(AksSkuTier.FREE, () => "FREE" as const)
            .with(AksSkuTier.STANDARD, () => "STANDARD" as const)
            .otherwise(() => "UNKNOWN" as const),
          cidrRange: value.cidrRange,
        }))
        .exhaustive(),
    },
  };
}
