import React from "react";

import Spacer from "components/porter/Spacer";

import { useClusterContext } from "../ClusterContextProvider";
import ClusterSaveButton from "../ClusterSaveButton";
import AdvancedSettings from "../shared/advanced/AdvancedSettings";

const AdvancedSettingsTab: React.FC = () => {
  const { isClusterUpdating } = useClusterContext();

  return (
    <div>
      <AdvancedSettings />
      <Spacer y={1} />
      <ClusterSaveButton isClusterUpdating={isClusterUpdating}>
        Update
      </ClusterSaveButton>
      <Spacer y={1} />
    </div>
  );
};

export default AdvancedSettingsTab;
