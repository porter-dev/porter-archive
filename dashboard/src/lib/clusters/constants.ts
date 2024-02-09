import aws from "assets/aws.png";
import azure from "assets/azure.png";
import infra from "assets/cluster.svg";
import gcp from "assets/gcp.png";

import { type CloudProvider } from "./types";

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
export const CloudProviderLocal: CloudProvider = {
  name: "Local",
  displayName: "Local",
  icon: infra,
};
export const SUPPORTED_CLOUD_PROVIDERS = [
  CloudProviderAWS,
  CloudProviderGCP,
  CloudProviderAzure,
  CloudProviderLocal,
];
