import React from "react";
import Fieldset from "legacy/components/porter/Fieldset";
import Spacer from "legacy/components/porter/Spacer";
import { match } from "ts-pattern";

import { useClusterContext } from "../../ClusterContextProvider";
import ClusterSaveButton from "../../ClusterSaveButton";
import AKSClusterOverview from "./AKSClusterOverview";
import EKSClusterOverview from "./EKSClusterOverview";
import GKEClusterOverview from "./GKEClusterOverview";

const ClusterOverview: React.FC = () => {
  const { cluster, isClusterUpdating } = useClusterContext();

  if (!cluster.contract) {
    return <Fieldset>Unable to load overview for this cluster.</Fieldset>;
  }
  return (
    <>
      {match(cluster.contract.config.cluster.config)
        .with({ kind: "EKS" }, () => {
          return <EKSClusterOverview />;
        })
        .with({ kind: "GKE" }, () => {
          return <GKEClusterOverview />;
        })
        .with({ kind: "AKS" }, () => {
          return <AKSClusterOverview />;
        })
        .exhaustive()}
      <Spacer y={1} />
      <ClusterSaveButton isClusterUpdating={isClusterUpdating}>
        Update
      </ClusterSaveButton>
      <Spacer y={1} />
    </>
  );
};

export default ClusterOverview;
