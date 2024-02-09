import React from "react";
import { match } from "ts-pattern";

import { useClusterContext } from "../../ClusterContextProvider";
import EKSClusterOverview from "./EKSClusterOverview";

const ClusterOverview: React.FC = () => {
  const { cluster } = useClusterContext();

  return match(cluster.cloud_provider)
    .with({ name: "AWS" }, () => {
      return <EKSClusterOverview />;
    })
    .with({ name: "GCP" }, () => {
      return <div>GCP</div>;
    })
    .with({ name: "Azure" }, () => {
      return <div>Azure</div>;
    })
    .with({ name: "Local" }, () => {
      return <div>Local</div>;
    })
    .exhaustive();
};

export default ClusterOverview;
