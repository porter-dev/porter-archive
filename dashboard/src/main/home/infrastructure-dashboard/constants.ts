import { type SerializedCluster } from "lib/hooks/useCluster";

import aws from "assets/aws.png";
import azure from "assets/azure.png";
import gcp from "assets/gcp.png";

export type CloudProvider = {
  name: SerializedCluster["cloud_provider"];
  displayName: string;
  icon: string;
};
export const CloudProviderAWS: CloudProvider = {
  name: "AWS",
  displayName: "Amazon Web Services",
  icon: aws,
};
export const CloudProviderGCP: CloudProvider = {
  name: "GCP",
  displayName: "Google Cloud Platform",
  icon: gcp,
};
export const CloudProviderAzure: CloudProvider = {
  name: "Azure",
  displayName: "Microsoft Azure",
  icon: azure,
};

export const SUPPORTED_CLOUD_PROVIDERS = [
  CloudProviderAWS,
  CloudProviderGCP,
  CloudProviderAzure,
];
