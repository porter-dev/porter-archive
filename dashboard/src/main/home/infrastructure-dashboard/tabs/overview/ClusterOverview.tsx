import React from "react";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";

import { useClusterContext } from "../../ClusterContextProvider";
import ClusterSaveButton from "../../ClusterSaveButton";
import { type UpdateClusterButtonProps } from "../../forms/CreateClusterForm";
import AKSClusterOverview from "./AKSClusterOverview";
import EKSClusterOverview from "./EKSClusterOverview";
import GKEClusterOverview from "./GKEClusterOverview";

type Props = {
  updateClusterButtonProps: UpdateClusterButtonProps;
};
const ClusterOverview: React.FC<Props> = ({ updateClusterButtonProps }) => {
  const { cluster } = useClusterContext();

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
      <ClusterSaveButton
        status={updateClusterButtonProps.status}
        isDisabled={updateClusterButtonProps.isDisabled}
        loadingText={updateClusterButtonProps.loadingText}
      />
      <Spacer y={1} />
    </>
  );
};

export default ClusterOverview;
