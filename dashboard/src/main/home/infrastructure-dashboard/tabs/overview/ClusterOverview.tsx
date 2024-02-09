import React from "react";
import { match } from "ts-pattern";

import { useClusterContext } from "../../ClusterContextProvider";
import EKSClusterOverview from "./EKSClusterOverview";

const ClusterOverview: React.FC = () => {
  const { latestClusterConfig } = useClusterContext();

  return match(latestClusterConfig)
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
