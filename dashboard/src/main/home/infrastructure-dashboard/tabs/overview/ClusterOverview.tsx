import React from "react";
import { match } from "ts-pattern";

import Spacer from "components/porter/Spacer";

import { useClusterContext } from "../../ClusterContextProvider";
import ClusterSaveButton from "../../ClusterSaveButton";
import { type ButtonStatus } from "../../ClusterTabs";
import AKSClusterOverview from "./AKSClusterOverview";
import EKSClusterOverview from "./EKSClusterOverview";
import GKEClusterOverview from "./GKEClusterOverview";

type Props = {
  updateButtonStatus: ButtonStatus;
  isUpdateDisabled: boolean;
};
const ClusterOverview: React.FC<Props> = ({
  updateButtonStatus,
  isUpdateDisabled,
}) => {
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
        status={updateButtonStatus}
        isDisabled={isUpdateDisabled}
      />
      <Spacer y={1} />
    </>
  );
};

export default ClusterOverview;
