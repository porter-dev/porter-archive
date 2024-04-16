import { useQuery } from "@tanstack/react-query";

import { useClusterFormContext } from "../../main/home/infrastructure-dashboard/ClusterFormContextProvider";
import { CloudProviderAzure } from "../clusters/constants";
import type {
  AWSRegion,
  AzureRegion,
  ClientMachineType,
  GCPRegion,
} from "../clusters/types";

type TUseMachineTypeList = {
  machineTypes: ClientMachineType[];
  isLoading: boolean;
};
export const useMachineTypeList = ({
  cloudProvider,
  cloudProviderCredentialIdentifier,
  region,
}: {
  cloudProvider?: string;
  cloudProviderCredentialIdentifier?: string;
  region?: AWSRegion | GCPRegion | AzureRegion;
}): TUseMachineTypeList => {
  const { availableMachineTypes } = useClusterFormContext();

  const { data: machineTypes, isLoading } = useQuery(
    [
      "availableMachineTypes",
      region,
      cloudProvider,
      cloudProviderCredentialIdentifier,
    ],
    async () => {
      if (!cloudProvider || !cloudProviderCredentialIdentifier || !region) {
        return [];
      }
      try {
        const machineTypes = await availableMachineTypes(
          cloudProvider,
          cloudProviderCredentialIdentifier,
          region
        );
        const machineTypesNames = machineTypes.map(
          (machineType) => machineType.name
        );

        return CloudProviderAzure.machineTypes.filter((mt) =>
          machineTypesNames.includes(mt.name)
        );
      } catch (err) {
        // fallback to default machine types if api call fails
        return CloudProviderAzure.machineTypes.filter((mt) =>
          mt.supportedRegions.includes(region)
        );
      }
    },
    {
      enabled:
        !!cloudProvider && !!cloudProviderCredentialIdentifier && !!region,
    }
  );

  return {
    machineTypes: machineTypes ?? [],
    isLoading,
  };
};
