import React from "react";
import { type ClientClusterContract } from "legacy/lib/clusters/types";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import EKSClusterAdvancedSettings from "./EKSClusterAdvancedSettings";

const AdvancedSettings: React.FC = () => {
  const { watch } = useFormContext<ClientClusterContract>();
  const cloudProvider = watch("cluster.cloudProvider");

  return match(cloudProvider)
    .with("AWS", () => <EKSClusterAdvancedSettings />)
    .otherwise(() => null);
};

export default AdvancedSettings;
