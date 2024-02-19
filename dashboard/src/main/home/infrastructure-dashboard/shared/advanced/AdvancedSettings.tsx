import React from "react";
import { useFormContext } from "react-hook-form";
import { match } from "ts-pattern";

import { type ClientClusterContract } from "lib/clusters/types";

import EKSClusterAdvancedSettings from "./EKSClusterAdvancedSettings";

const AdvancedSettings: React.FC = () => {
  const { watch } = useFormContext<ClientClusterContract>();
  const cloudProvider = watch("cluster.cloudProvider");

  return match(cloudProvider)
    .with("AWS", () => <EKSClusterAdvancedSettings />)
    .otherwise(() => null);
};

export default AdvancedSettings;
