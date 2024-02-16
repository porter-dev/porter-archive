import {
  AKS,
  AKSNodePool,
  AksSkuTier,
  AWSClusterNetwork,
  Cluster,
  EKS,
  EKSLogging,
  EKSNodeGroup,
  EnumCloudProvider,
  GKE,
  GKENetwork,
  GKENodePool,
  GKENodePoolType,
  LoadBalancer,
  LoadBalancerType,
  NodeGroupType,
  NodePoolType,
  type Contract,
} from "@porter-dev/api-contracts";
import { match } from "ts-pattern";

import {
  type AKSClientClusterConfig,
  type AWSRegion,
  type AzureRegion,
  type ClientClusterContract,
  type EKSClientClusterConfig,
  type GCPRegion,
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
      cluster.kindValues.value = clientEKSConfigToProto(
        config,
        cluster.kindValues.value
      );
    })
    .with({ kind: "GKE" }, (config) => {
      if (cluster.kindValues.case !== "gkeKind") {
        throw new Error("Invalid kind value for GKE");
      }
      cluster.kindValues.value = clientGKEConfigToProto(
        config,
        cluster.kindValues.value
      );
    })
    .with({ kind: "AKS" }, (config) => {
      if (cluster.kindValues.case !== "aksKind") {
        throw new Error("Invalid kind value for AKS");
      }
      cluster.kindValues.value = clientAKSConfigToProto(
        config,
        cluster.kindValues.value
      );
    });

  return cluster;
}

function clientEKSConfigToProto(
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
    loadBalancer: new LoadBalancer({
      loadBalancerType: match(clientConfig.loadBalancer.type)
        .with("NLB", () => LoadBalancerType.NLB)
        .with("ALB", () => LoadBalancerType.ALB)
        .otherwise(() => LoadBalancerType.UNSPECIFIED),
      wildcardDomain: clientConfig.loadBalancer.wildcardDomain,
      allowlistIpRanges: clientConfig.loadBalancer.allowlistIpRanges,
      enableWafv2: clientConfig.loadBalancer.isWafV2Enabled,
      wafv2Arn: clientConfig.loadBalancer.wafV2Arn,
      additionalCertificateArns: clientConfig.loadBalancer.certificateArns,
      tags: clientConfig.loadBalancer.awsTags,
    }),
    logging: new EKSLogging({
      ...(existingConfig?.logging ?? {}),
      enableApiServerLogs: clientConfig.logging.isApiServerLogsEnabled,
      enableAuditLogs: clientConfig.logging.isAuditLogsEnabled,
      enableAuthenticatorLogs: clientConfig.logging.isAuthenticatorLogsEnabled,
      enableControllerManagerLogs:
        clientConfig.logging.isControllerManagerLogsEnabled,
      enableSchedulerLogs: clientConfig.logging.isSchedulerLogsEnabled,
    }),
    enableEcrScanning: clientConfig.isEcrScanningEnabled,
    enableGuardDuty: clientConfig.isGuardDutyEnabled,
    enableKmsEncryption: clientConfig.isKmsEncryptionEnabled,
  });
}

function clientGKEConfigToProto(
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

function clientAKSConfigToProto(
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
        .with({ case: "eksKind" }, ({ value }) =>
          clientEKSConfigFromProto(value)
        )
        .with({ case: "gkeKind" }, ({ value }) =>
          clientGKEConfigFromProto(value)
        )
        .with({ case: "aksKind" }, ({ value }) =>
          clientAKSConfigFromProto(value)
        )
        .exhaustive(),
    },
  };
}

const clientEKSConfigFromProto = (value: EKS): EKSClientClusterConfig => {
  return {
    kind: "EKS",
    clusterName: value.clusterName,
    region: value.region as AWSRegion, // remove type assertion here somehow
    clusterVersion: value.clusterVersion,
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
    logging: {
      isApiServerLogsEnabled: value.logging?.enableApiServerLogs ?? false,
      isAuditLogsEnabled: value.logging?.enableAuditLogs ?? false,
      isAuthenticatorLogsEnabled:
        value.logging?.enableAuthenticatorLogs ?? false,
      isControllerManagerLogsEnabled:
        value.logging?.enableControllerManagerLogs ?? false,
      isSchedulerLogsEnabled: value.logging?.enableSchedulerLogs ?? false,
    },
    loadBalancer: {
      type: match(value.loadBalancer?.loadBalancerType)
        .with(LoadBalancerType.NLB, () => "NLB" as const)
        .with(LoadBalancerType.ALB, () => "ALB" as const)
        .otherwise(() => "UNKNOWN" as const),
      wildcardDomain: value.loadBalancer?.wildcardDomain ?? "",
      allowlistIpRanges: value.loadBalancer?.allowlistIpRanges ?? "",
      certificateArns: value.loadBalancer?.additionalCertificateArns ?? [],
      awsTags: value.loadBalancer?.tags ?? {},
      isWafV2Enabled: value.loadBalancer?.enableWafv2 ?? false,
      wafV2Arn: value.loadBalancer?.wafv2Arn ?? "",
    },
    isEcrScanningEnabled: value.enableEcrScanning,
    isGuardDutyEnabled: value.enableGuardDuty,
    isKmsEncryptionEnabled: value.enableKmsEncryption,
  };
};

const clientGKEConfigFromProto = (value: GKE): GKEClientClusterConfig => {
  return {
    kind: "GKE",
    clusterName: value.clusterName,
    region: value.region as GCPRegion, // remove type assertion here somehow
    clusterVersion: value.clusterVersion,
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
  };
};

const clientAKSConfigFromProto = (value: AKS): AKSClientClusterConfig => {
  return {
    kind: "AKS",
    clusterName: value.clusterName,
    region: value.location as AzureRegion, // remove type assertion here somehow
    clusterVersion: value.clusterVersion,
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
  };
};
