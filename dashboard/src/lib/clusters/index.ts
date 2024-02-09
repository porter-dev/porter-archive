import { EnumCloudProvider, type Contract } from "@porter-dev/api-contracts";
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
): ClientClusterContract {
  const contractCluster = contract.cluster;
  if (!contractCluster) {
    throw new Error("Cluster not found in contract");
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
        }))
        .with({ case: "gkeKind" }, ({ value }) => ({
          kind: "GKE" as const,
          clusterName: value.clusterName,
          clusterVersion: value.clusterVersion,
          region: value.region,
        }))
        .with({ case: "aksKind" }, ({ value }) => ({
          kind: "AKS" as const,
          clusterName: value.clusterName,
          clusterVersion: value.clusterVersion,
          location: value.location,
        }))
        .with({ case: undefined }, () => undefined)
        .exhaustive(),
    },
  };
}
