import React from "react";
import { match } from "ts-pattern";

import { useClusterContext } from "../../ClusterContextProvider";
import EKSClusterOverview from "./EKSClusterOverview";

const ClusterOverview: React.FC = () => {
  const { cluster } = useClusterContext();

  return match(cluster.contract.config.cluster.config)
    .with({ kind: "EKS" }, (config) => {
      return <EKSClusterOverview config={config} />;
    })
    .with({ kind: "GKE" }, () => {
      return <div>GCP</div>;
    })
    .with({ kind: "AKS" }, () => {
      return <div>Azure</div>;
    })
    .exhaustive();
};

export default ClusterOverview;
